/**
 * GapCodeDriver reuses the Codex app-server protocol exposed by GapCode's CLI.
 * The GapCode launcher supplies its own GAPCODE_HOME, so this driver leaves
 * Codex home and shadow-home handling out of the process environment.
 */
import { CodexSettings, GapCodeSettings, ProviderDriverKind } from "@t3tools/contracts";
import * as Crypto from "effect/Crypto";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { HttpClient } from "effect/http";
import { ChildProcessSpawner } from "effect/process";

import { makeCodexTextGeneration } from "../../textGeneration/CodexTextGeneration.ts";
import * as ServerConfig from "../../config.ts";
import { ProviderDriverError } from "../Errors.ts";
import {
  createCodexAdapterV2,
  type CodexAdapterV2DriverEnv,
} from "../../orchestration-v2/Adapters/CodexAdapterV2.ts";
import * as ResetCreditCoordinator from "../resetCreditCoordinator.ts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import * as ProviderLatestVersions from "@t3tools/provider-core/server/ProviderLatestVersions";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import { makeManagedServerProvider } from "@t3tools/provider-core/server/managedProvider";
import * as ModelCatalog from "@t3tools/provider-core/server/ModelCatalog";
import {
  checkCodexProviderStatus,
  makePendingCodexProvider,
  probeCodexSkillsForCwd,
  withCodexAppServerClient,
} from "../CodexProvider.ts";
import {
  enrichProviderSnapshotWithVersionAdvisory,
  makeCachedProviderMaintenanceResolution,
  makeManualOnlyProviderMaintenanceCapabilities,
  makeProviderMaintenanceCapabilities,
  normalizeCommandPath,
  resolveProviderMaintenanceCapabilitiesEffect,
  type ProviderMaintenanceResolutionContext,
} from "@t3tools/provider-core/server/maintenanceResolver";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
  type ProviderSnapshotSettings,
} from "@t3tools/provider-core/server/snapshotSettings";
import {
  defaultProviderContinuationIdentity,
  type ProviderDriver,
  type ProviderInstance,
} from "@t3tools/provider-core/server/driver";
import { withInstanceIdentity } from "@t3tools/provider-core/server/instanceIdentity";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import { gapCodeUsageReader } from "./codexUsage.ts";

const decodeGapCodeSettings = Schema.decodeSync(GapCodeSettings);
const DRIVER_KIND = ProviderDriverKind.make("gapcode");

function isGapCodeNativeCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return ["/.gapcode/bin/gapcode", "/.gapcode/bin/gapcode.cmd", "/.gapcode/bin/gapcode.exe"].some(
    (suffix) => normalized.endsWith(suffix),
  );
}

const gapCodeMaintenanceResolver = {
  resolve: (context: ProviderMaintenanceResolutionContext | null) => {
    const manual = makeManualOnlyProviderMaintenanceCapabilities({
      provider: DRIVER_KIND,
      packageName: null,
    });
    if (
      !context ||
      ![context.resolvedCommandPath, context.realCommandPath].some(isGapCodeNativeCommandPath)
    ) {
      return Effect.succeed(manual);
    }
    return Effect.succeed(
      makeProviderMaintenanceCapabilities({
        provider: DRIVER_KIND,
        packageName: null,
        updateExecutable: context.resolvedCommandPath,
        updateArgs: ["update"],
        updateLockKey: "gapcode-native",
        platform: context.platform,
        env: context.env,
      }),
    );
  },
};

const PROVIDER_OPTIONS = {
  displayName: "GapCode",
  loginCommand: "gapcode login",
  authLabel: "GapGPT",
  includeUsageLimits: true,
  includeApiKeyUsageLimits: true,
  preferCodexDefaultModel: false,
  feedbackDescription: "Send this thread and GapCode logs to GapCode",
} as const;

function toCodexSettings(config: GapCodeSettings): CodexSettings {
  return {
    enabled: config.enabled,
    binaryPath: config.binaryPath,
    homePath: "",
    shadowHomePath: "",
    launchArgs: config.launchArgs,
    customModels: config.customModels,
  };
}

export type GapCodeDriverEnv =
  | CodexAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | Crypto.Crypto
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | ModelCatalog.ModelCatalog
  | Path.Path
  | ResetCreditCoordinator.ResetCreditCoordinator
  | ServerConfig.ServerConfig;

export const GapCodeDriver: ProviderDriver<GapCodeSettings, GapCodeDriverEnv, Path.Path> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: "GapCode",
    supportsMultipleInstances: true,
  },
  configSchema: GapCodeSettings,
  defaultConfig: (): GapCodeSettings => decodeGapCodeSettings({}),
  usage: gapCodeUsageReader,
  create: ({ instanceId, displayName, accentColor, environment, enabled, config }) =>
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const fileSystem = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;
      const httpClient = yield* HttpClient.HttpClient;
      const resetCreditCoordinator = yield* ResetCreditCoordinator.ResetCreditCoordinator;
      const latestVersions = yield* ProviderLatestVersions.ProviderLatestVersions;
      const modelCatalog = yield* ModelCatalog.ModelCatalog;
      const currentCatalog = modelCatalog.current(DRIVER_KIND);
      const processEnv = yield* mergeProviderInstanceEnvironment(environment);
      const providerEnv = { ...processEnv };
      delete providerEnv.CODEX_HOME;
      delete providerEnv.T3CODE_CODEX_LAUNCH_ARGS;
      const continuationIdentity = defaultProviderContinuationIdentity({
        driverKind: DRIVER_KIND,
        instanceId,
      });
      const stampIdentity = withInstanceIdentity({
        instanceId,
        driverKind: DRIVER_KIND,
        displayName,
        accentColor,
        continuationGroupKey: continuationIdentity.continuationKey,
      });
      const effectiveConfig = {
        ...toCodexSettings({ ...config, enabled }),
        binaryPath: expandHomePath(config.binaryPath, yield* HostProcess.HomeDirectory),
      } satisfies CodexSettings;
      const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
        resolveProviderMaintenanceCapabilitiesEffect(gapCodeMaintenanceResolver, {
          binaryPath: effectiveConfig.binaryPath,
          env: providerEnv,
        }).pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
          Effect.provideService(FileSystem.FileSystem, fileSystem),
          Effect.provideService(Path.Path, pathService),
        ),
      );
      const checkProvider = modelCatalog.refreshInBackground.pipe(
        Effect.andThen(
          Effect.zipWith(
            checkCodexProviderStatus(
              effectiveConfig,
              undefined,
              providerEnv,
              undefined,
              PROVIDER_OPTIONS,
            ),
            currentCatalog,
            (draft, catalog) => stampIdentity(ModelCatalog.applyModelCatalog(draft, catalog)),
            { concurrent: true },
          ),
        ),
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      );
      const snapshotSettings = yield* makeProviderSnapshotSettingsSource(effectiveConfig);
      const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<CodexSettings>>({
        resolveMaintenance,
        getSettings: snapshotSettings.getSettings,
        streamSettings: snapshotSettings.streamSettings,
        haveSettingsChanged: haveProviderSnapshotSettingsChanged,
        initialSnapshot: (settings) =>
          Effect.zipWith(
            makePendingCodexProvider(settings.provider, PROVIDER_OPTIONS),
            currentCatalog,
            (draft, catalog) => stampIdentity(ModelCatalog.applyModelCatalog(draft, catalog)),
          ),
        checkProvider,
        enrichSnapshot: ({ settings, snapshot, publishSnapshot }) =>
          resolveMaintenance().pipe(
            Effect.flatMap((maintenanceCapabilities) =>
              enrichProviderSnapshotWithVersionAdvisory(snapshot, maintenanceCapabilities, {
                enableProviderUpdateChecks: settings.enableProviderUpdateChecks,
              }),
            ),
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.provideService(ProviderLatestVersions.ProviderLatestVersions, latestVersions),
            Effect.flatMap((enrichedSnapshot) => publishSnapshot(enrichedSnapshot)),
          ),
      }).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderDriverError({
              driver: DRIVER_KIND,
              instanceId,
              detail: `Failed to build GapCode snapshot: ${cause.message ?? String(cause)}`,
              cause,
            }),
        ),
      );
      const models = snapshot.getSnapshot.pipe(Effect.map((provider) => provider.models));
      // GapGPT proxies streaming turns through an upstream OpenAI pool whose
      // in-flight `account/rateLimits/updated` notifications reflect the pool's
      // shared allowance rather than the user's GapGPT plan quota. Instead of
      // overwriting the true limits with proxy telemetry mid-turn, debounce a
      // snapshot refresh that reads the user's authentic limits via `account/rateLimits/read`.
      const refreshUsageLimitsQueue = yield* Queue.sliding<void>(1);
      yield* Stream.fromQueue(refreshUsageLimitsQueue).pipe(
        Stream.debounce(Duration.seconds(3)),
        Stream.runForEach(() => snapshot.refresh.pipe(Effect.ignoreCause({ log: true }))),
        Effect.forkScoped,
      );
      const orchestrationAdapter = yield* createCodexAdapterV2(
        {
          instanceId,
          displayName,
          accentColor,
          environment: environment.filter(
            (v) => v.name !== "CODEX_HOME" && v.name !== "T3CODE_CODEX_LAUNCH_ARGS",
          ),
          enabled,
          config: effectiveConfig,
        },
        {
          driver: DRIVER_KIND,
          onUsageLimits: () => Queue.offer(refreshUsageLimitsQueue, undefined).pipe(Effect.asVoid),
        },
      ).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderDriverError({
              driver: DRIVER_KIND,
              instanceId,
              detail: "Failed to build GapCode orchestration adapter.",
              cause,
            }),
        ),
      );
      const textGeneration = yield* makeCodexTextGeneration(effectiveConfig, providerEnv, models);
      const accountKey = `gapcode:${normalizeCommandPath(effectiveConfig.binaryPath || "gapcode")}`;
      const consumeResetCredit: NonNullable<ProviderInstance["consumeResetCredit"]> = () =>
        resetCreditCoordinator
          .redeem(accountKey, (idempotencyKey) =>
            Effect.gen(function* () {
              const { client } = yield* withCodexAppServerClient({
                binaryPath: effectiveConfig.binaryPath,
                launchArgs: effectiveConfig.launchArgs,
                cwd: process.cwd(),
                environment: providerEnv,
              });
              const response = yield* client.request("account/rateLimitResetCredit/consume", {
                idempotencyKey,
              });
              return response.outcome;
            }).pipe(Effect.scoped, Effect.timeout("20 seconds")),
          )
          .pipe(
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
            Effect.mapError(
              (cause) =>
                new ProviderDriverError({
                  driver: DRIVER_KIND,
                  instanceId,
                  detail: "GapCode could not redeem the reset credit.",
                  cause,
                }),
            ),
            Effect.tap((outcome) =>
              Effect.gen(function* () {
                const before = (yield* snapshot.getSnapshot).usageLimits?.checkedAt;
                const refreshed = yield* snapshot.refresh;
                const after = refreshed.usageLimits?.checkedAt;
                if (
                  outcome === "reset" &&
                  (after === undefined ||
                    after === before ||
                    refreshed.usageLimits?.unavailable?.reason === "probeFailed")
                ) {
                  return yield* new ProviderDriverError({
                    driver: DRIVER_KIND,
                    instanceId,
                    detail:
                      "The reset was applied, but GapCode could not confirm the new limits. Refresh to check.",
                  });
                }
              }),
            ),
          );

      return {
        instanceId,
        driverKind: DRIVER_KIND,
        continuationIdentity,
        displayName,
        accentColor,
        enabled,
        snapshot,
        snapshotForCwd: (cwd) =>
          !effectiveConfig.enabled
            ? snapshot.getSnapshot
            : Effect.all([
                snapshot.getSnapshot,
                probeCodexSkillsForCwd({
                  binaryPath: effectiveConfig.binaryPath,
                  launchArgs: effectiveConfig.launchArgs,
                  cwd,
                  environment: providerEnv,
                }).pipe(
                  Effect.scoped,
                  Effect.timeout("20 seconds"),
                  Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
                ),
              ]).pipe(
                Effect.map(([provider, skills]) => ({ ...provider, skills })),
                Effect.mapError(
                  (cause) =>
                    new ProviderDriverError({
                      driver: DRIVER_KIND,
                      instanceId,
                      detail: `Failed to probe GapCode skills for '${cwd}'`,
                      cause,
                    }),
                ),
              ),
        consumeResetCredit,
        orchestrationAdapter,
        textGeneration,
      } satisfies ProviderInstance;
    }),
};
