import type { ProviderOptionDescriptor } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { buildTraitsTriggerDisplay, getDescriptorStringValue } from "./modelTraits.ts";

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

describe("buildTraitsTriggerDisplay", () => {
  it("hides Standard and marks Fast as speed", () => {
    const standard = buildTraitsTriggerDisplay({
      descriptors: descriptors("standard"),
      primarySelectDescriptorId: "reasoningEffort",
      ultrathinkPromptControlled: false,
    });
    expect(standard).toEqual({ label: "High", speedLabel: null, ultracode: false });

    const fast = buildTraitsTriggerDisplay({
      descriptors: descriptors("fast"),
      primarySelectDescriptorId: "reasoningEffort",
      ultrathinkPromptControlled: false,
    });
    expect(fast).toEqual({ label: "High Fast", speedLabel: "Fast", ultracode: false });
  });
  it.each([
    { currentValue: undefined, defaultValue: undefined, value: null, label: "Thinking" },
    { currentValue: undefined, defaultValue: "high", value: "high", label: "High" },
    { currentValue: "low", defaultValue: undefined, value: "low", label: "Low" },
    { currentValue: "max", defaultValue: "high", value: "max", label: "Max" },
    { id: "effort", currentValue: undefined, defaultValue: undefined, value: null, label: "" },
  ])("labels Pi thinking without inventing a selection: $label ($value)", (input) => {
    const descriptor: Extract<ProviderOptionDescriptor, { type: "select" }> = {
      id: input.id ?? "thinking",
      label: "Thinking",
      type: "select",
      options: ["low", "high", "max"].map((id) => ({
        id,
        label: id[0]!.toUpperCase() + id.slice(1),
        ...(id === input.defaultValue ? { isDefault: true } : {}),
      })),
      ...(input.currentValue ? { currentValue: input.currentValue } : {}),
    };

    expect(
      buildTraitsTriggerDisplay({
        descriptors: [descriptor],
        primarySelectDescriptorId: descriptor.id,
        ultrathinkPromptControlled: false,
      }).label,
    ).toBe(input.label);
    expect(getDescriptorStringValue(descriptor)).toBe(input.value);
  });
});
