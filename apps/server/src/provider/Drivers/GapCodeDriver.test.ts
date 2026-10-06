// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect, it } from "@effect/vitest";
import { ProviderInstanceId } from "@t3tools/contracts";
import { HostProcessPlatform } from "@t3tools/shared/hostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { HttpClient } from "effect/http";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { NoOpProviderEventLoggers, ProviderEventLoggers } from "../ProviderEventLoggers.ts";
import * as ResetCreditCoordinator from "../resetCreditCoordinator.ts";
import * as CodexAdapterV2 from "../../orchestration-v2/Adapters/CodexAdapterV2.ts";
import * as IdAllocator from "../../orchestration-v2/IdAllocator.ts";
import { GapCodeDriver } from "./GapCodeDriver.ts";

const testLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3-gapcode-driver-maintenance-",
}).pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(IdAllocator.layer),
  Layer.provideMerge(
    Layer.mock(CodexAdapterV2.CodexAppServerClientFactory)({
      open: () => Effect.die("Maintenance resolution must not open a GapCode session"),
    }),
  ),
  Layer.provideMerge(ServerSettingsService.layerTest()),
  Layer.provideMerge(ResetCreditCoordinator.layerTest),
  Layer.provideMerge(
    Layer.mock(BackgroundPolicy.BackgroundPolicy)({
      shouldRunScopeWork: () => Effect.succeed(false),
    }),
  ),
  Layer.provideMerge(Layer.succeed(ProviderEventLoggers, NoOpProviderEventLoggers)),
  Layer.provideMerge(
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("Disabled GapCode must not make an HTTP request")),
    ),
  ),
);

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
        HostProcessPlatform.defaultValue() === "win32" ? "gapcode.cmd" : "gapcode",
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
});
