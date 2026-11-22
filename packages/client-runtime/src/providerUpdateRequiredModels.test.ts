import { ProviderDriverKind } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  formatProviderUpdateRequiredNotice,
  providerUpdateChannelLags,
} from "./providerUpdateRequiredModels.ts";

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

  it("does not ask for an update the install's own channel cannot deliver", () => {
    const homebrewClaude = {
      driver: ProviderDriverKind.make("claudeAgent"),
      updateRequiredModels: [
        { slug: "claude-fable-5-2", name: "Claude Fable 5.2", minVersion: "2.1.321" },
      ],
      versionAdvisory: {
        status: "current" as const,
        currentVersion: "2.1.311",
        latestVersion: "2.1.311",
        updateCommand: "brew upgrade --cask claude-code",
        canUpdate: true,
        checkedAt: null,
        message: null,
      },
    };

    const notice = formatProviderUpdateRequiredNotice(homebrewClaude);

    expect(notice).toBe(
      "Using Claude Fable 5.2 requires Claude Code v2.1.321 or newer, but the claude-code Homebrew cask only has v2.1.311. Switch to the claude-code@latest cask: brew uninstall --cask claude-code && brew install --cask claude-code@latest",
    );
    expect(providerUpdateChannelLags(homebrewClaude)).toBe(true);
    expect(
      formatProviderUpdateRequiredNotice({
        ...homebrewClaude,
        versionAdvisory: { ...homebrewClaude.versionAdvisory, updateCommand: null },
      }),
    ).toBe(
      "Using Claude Fable 5.2 requires Claude Code v2.1.321 or newer, but the newest this install can update to is v2.1.311. Install Claude Code another way or wait for a newer release.",
    );
    expect(
      formatProviderUpdateRequiredNotice({
        ...homebrewClaude,
        versionAdvisory: { ...homebrewClaude.versionAdvisory, latestVersion: "2.1.330" },
      }),
    ).toBe("Update Claude Code to v2.1.321 or newer to use Claude Fable 5.2.");
    expect(
      providerUpdateChannelLags({
        ...homebrewClaude,
        versionAdvisory: { ...homebrewClaude.versionAdvisory, latestVersion: "2.1.330" },
      }),
    ).toBe(false);
  });
});
