// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect, it } from "@effect/vitest";
import { ProviderInstanceId, type ServerProvider } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { HttpClient, HttpClientResponse } from "effect/http";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import * as ProviderEventLoggers from "@t3tools/provider-core/server/ProviderEventLoggers";
import * as ProviderLatestVersions from "@t3tools/provider-core/server/ProviderLatestVersions";
import { enrichProviderSnapshotWithVersionAdvisory } from "@t3tools/provider-core/server/maintenanceResolver";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import * as ServerSecretStore from "../../auth/ServerSecretStore.ts";
import * as ModelManifest from "../ModelManifest.ts";
import * as ProviderHostLive from "../ProviderHostLive.ts";
import * as ResetCreditCoordinator from "../resetCreditCoordinator.ts";
import * as CodexAdapterV2 from "../../orchestration-v2/Adapters/CodexAdapterV2.ts";
import * as PortScanner from "../../preview/PortScanner.ts";
import { GapCodeDriver } from "./GapCodeDriver.ts";

const layerDeps = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3-gapcode-driver-maintenance-",
}).pipe(
  Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  Layer.provideMerge(IdAllocator.layer),
  Layer.provideMerge(McpProviderSessions.layer),
  Layer.provideMerge(PortScanner.layerTest),
  Layer.provideMerge(
    Layer.mock(CodexAdapterV2.CodexAppServerClientFactory)({
      open: () => Effect.die("Maintenance resolution must not open a GapCode session"),
    }),
  ),
  Layer.provideMerge(ServerSettingsService.layerTest()),
  Layer.provideMerge(ModelManifest.layerTest),
  Layer.provideMerge(ResetCreditCoordinator.layerTest),
  Layer.provideMerge(
    Layer.mock(BackgroundPolicy.BackgroundPolicy)({
      shouldRunScopeWork: () => Effect.succeed(false),
    }),
  ),
  Layer.provideMerge(Layer.mock(ServerSecretStore.ServerSecretStore)({})),
  Layer.provideMerge(
    Layer.succeed(
      ProviderEventLoggers.ProviderEventLoggers,
      ProviderEventLoggers.NoOpProviderEventLoggers,
    ),
  ),
  Layer.provideMerge(ProviderLatestVersions.layer),
  Layer.provideMerge(
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("Disabled GapCode must not make an HTTP request")),
    ),
  ),
);
const testLayer = ProviderHostLive.layer.pipe(Layer.provideMerge(layerDeps));

const noSpawn = ChildProcessSpawner.make(() =>
  Effect.die("Disabled GapCode must not spawn a process"),
);

it.layer(testLayer)("GapCodeDriver", (it) => {
  it.effect("offers the native updater only for the GapCode-managed launcher", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const tempDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-gapcode-driver-" });
      const binaryPath = NodePath.join(
        tempDir,
        ".gapcode",
        "bin",
        HostProcess.Platform.defaultValue() === "win32" ? "gapcode.cmd" : "gapcode",
      );
      yield* fs.makeDirectory(NodePath.dirname(binaryPath), { recursive: true });
      yield* fs.writeFileString(binaryPath, "stub");

      const instance = yield* GapCodeDriver.create({
        instanceId: ProviderInstanceId.make("gapcode-managed"),
        displayName: "GapCode test",
        enabled: false,
        environment: [],
        config: { ...GapCodeDriver.defaultConfig(), binaryPath },
      });

      expect((yield* instance.snapshot.resolveMaintenance()).update).toMatchObject({
        executable: binaryPath,
        args: ["update"],
        lockKey: "gapcode-native",
      });
      expect(instance.consumeResetCredit).toBeTypeOf("function");
    }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, noSpawn), Effect.scoped),
  );

  it.effect("keeps custom binaries manual-only", () =>
    Effect.gen(function* () {
      const binaryPath = NodePath.join(NodeOS.tmpdir(), "gapcode-custom-cli");
      const instance = yield* GapCodeDriver.create({
        instanceId: ProviderInstanceId.make("gapcode-custom"),
        displayName: "GapCode test",
        enabled: false,
        environment: [],
        config: { ...GapCodeDriver.defaultConfig(), binaryPath },
      });

      expect((yield* instance.snapshot.resolveMaintenance()).update).toBeNull();
    }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, noSpawn), Effect.scoped),
  );

  it.effect("provides an orchestration adapter configured with the gapcode driver kind", () =>
    Effect.gen(function* () {
      const instance = yield* GapCodeDriver.create({
        instanceId: ProviderInstanceId.make("gapcode-adapter-test"),
        displayName: "GapCode test",
        enabled: false,
        environment: [],
        config: GapCodeDriver.defaultConfig(),
      });

      expect(instance.orchestrationAdapter).toBeDefined();
      expect(instance.orchestrationAdapter.driver).toBe("gapcode");
      expect(instance.orchestrationAdapter.instanceId).toBe("gapcode-adapter-test");
      const capabilities = yield* instance.orchestrationAdapter.getCapabilities();
      expect(capabilities).toBeDefined();
    }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, noSpawn), Effect.scoped),
  );

  it.effect(
    "resolves latest version and creates a behind_latest version advisory when newer version is available",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const tempDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-gapcode-driver-" });
        const binaryPath = NodePath.join(
          tempDir,
          ".gapcode",
          "bin",
          HostProcess.Platform.defaultValue() === "win32" ? "gapcode.cmd" : "gapcode",
        );
        yield* fs.makeDirectory(NodePath.dirname(binaryPath), { recursive: true });
        yield* fs.writeFileString(binaryPath, "stub");

        const mockHttpClient = HttpClient.make((request) => {
          if (request.url === "https://gapgpt.app/api/v1/cli/latest-version") {
            return Effect.succeed(
              HttpClientResponse.fromWeb(
                request,
                new Response(JSON.stringify({ tag_name: "rust-v0.165.0", version: "0.165.0" }), {
                  headers: { "content-type": "application/json" },
                }),
              ),
            );
          }
          return Effect.die(`Unexpected HTTP request: ${request.url}`);
        });

        const instance = yield* GapCodeDriver.create({
          instanceId: ProviderInstanceId.make("gapcode-update-test"),
          displayName: "GapCode",
          enabled: true,
          environment: [],
          config: { ...GapCodeDriver.defaultConfig(), binaryPath },
        }).pipe(Effect.provideService(HttpClient.HttpClient, mockHttpClient));

        const capabilities = yield* instance.snapshot.resolveMaintenance();
        expect(capabilities.latestVersionCacheKey).toBe(
          "https://gapgpt.app/api/v1/cli/latest-version",
        );
        expect(capabilities.lookupLatestVersion).toBeDefined();

        const latest = yield* capabilities.lookupLatestVersion!;
        expect(latest).toBe("0.165.0");

        const mockSnapshot: ServerProvider = {
          instanceId: ProviderInstanceId.make("gapcode-update-test"),
          driver: "gapcode" as any,
          displayName: "GapCode",
          enabled: true,
          installed: true,
          version: "0.164.1",
          status: "ready",
          auth: { status: "authenticated" },
          checkedAt: "2026-01-01T00:00:00.000Z",
          models: [],
          slashCommands: [],
          skills: [],
        };

        const enriched = yield* enrichProviderSnapshotWithVersionAdvisory(
          mockSnapshot,
          capabilities,
          { enableProviderUpdateChecks: true },
        ).pipe(
          Effect.provideService(HttpClient.HttpClient, mockHttpClient),
          Effect.provideService(
            ProviderLatestVersions.ProviderLatestVersions,
            yield* ProviderLatestVersions.ProviderLatestVersions,
          ),
        );

        expect(enriched.versionAdvisory).toMatchObject({
          status: "behind_latest",
          currentVersion: "0.164.1",
          latestVersion: "0.165.0",
          canUpdate: true,
        });
        expect(enriched.versionAdvisory?.updateCommand).toContain("update");
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, noSpawn),
        Effect.scoped,
      ),
  );
});
