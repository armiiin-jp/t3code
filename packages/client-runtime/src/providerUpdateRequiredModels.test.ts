import { describe, expect, it } from "@effect/vitest";
import { ProviderDriverKind } from "@t3tools/contracts";
import { formatProviderUpdateRequiredNotice } from "./providerUpdateRequiredModels.ts";

describe("formatProviderUpdateRequiredNotice", () => {
  it("formats notice for GapCode using 'the GapCode CLI'", () => {
    const notice = formatProviderUpdateRequiredNotice({
      driver: ProviderDriverKind.make("gapcode"),
      updateRequiredModels: [
        {
          slug: "gpt-6.1-sol",
          name: "GPT-6.1 Sol",
          minVersion: "0.156.0",
        },
      ],
    });
    expect(notice).toBe("Update the GapCode CLI to v0.156.0 or newer to use GPT-6.1 Sol.");
  });

  it("formats notice for Codex using 'the Codex CLI'", () => {
    const notice = formatProviderUpdateRequiredNotice({
      driver: ProviderDriverKind.make("codex"),
      updateRequiredModels: [
        {
          slug: "gpt-6.1-sol",
          name: "GPT-6.1 Sol",
          minVersion: "0.153.0",
        },
      ],
    });
    expect(notice).toBe("Update the Codex CLI to v0.153.0 or newer to use GPT-6.1 Sol.");
  });

  it("returns null when no updateRequiredModels are present", () => {
    const notice = formatProviderUpdateRequiredNotice({
      driver: ProviderDriverKind.make("gapcode"),
      updateRequiredModels: [],
    });
    expect(notice).toBeNull();
  });
});
