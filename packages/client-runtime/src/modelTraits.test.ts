import { describe, expect, it } from "vite-plus/test";

import { ProviderDriverKind, type ProviderOptionDescriptor } from "@t3tools/contracts";
import { buildTraitsTriggerDisplay } from "./modelTraits.ts";

const descriptors = (serviceTier: string): ReadonlyArray<ProviderOptionDescriptor> => [
  {
    id: "reasoningEffort",
    label: "Reasoning",
    type: "select",
    currentValue: "high",
    options: [{ id: "high", label: "High" }],
  },
  {
    id: "serviceTier",
    label: "Service Tier",
    type: "select",
    currentValue: serviceTier,
    options: [
      { id: "standard", label: "Standard" },
      { id: "fast", label: "Fast" },
    ],
  },
];

describe("buildTraitsTriggerDisplay service tier", () => {
  it.each([ProviderDriverKind.make("codex"), ProviderDriverKind.make("gapcode")])(
    "%s hides Standard and marks Fast as speed",
    (provider) => {
      const standard = buildTraitsTriggerDisplay({
        provider,
        descriptors: descriptors("standard"),
        primarySelectDescriptorId: "reasoningEffort",
        ultrathinkPromptControlled: false,
      });
      expect(standard).toEqual({ label: "High", speedLabel: null, otherLabels: [] });

      const fast = buildTraitsTriggerDisplay({
        provider,
        descriptors: descriptors("fast"),
        primarySelectDescriptorId: "reasoningEffort",
        ultrathinkPromptControlled: false,
      });
      expect(fast).toEqual({ label: "High Fast", speedLabel: "Fast", otherLabels: [] });
    },
  );
});
