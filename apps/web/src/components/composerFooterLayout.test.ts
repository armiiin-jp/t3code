import { describe, expect, it } from "vite-plus/test";

import { resolveContextStripLabelsCompact } from "./BranchToolbar.logic";
import {
  resolveComposerRestingControlsArrivalTiming,
  resolveComposerRestingTransitionSettings,
  resolveComposerTimelineInset,
  resolveRestingComposerControlsLayout,
  resolveRestingComposerControlsNaturalWidth,
  shouldAnimateComposerContextStripArrival,
} from "./composerFooterLayout";

describe("resolveComposerTimelineInset", () => {
  it("keeps timeline padding stable when the model-only strip appears on collapse", () => {
    const expanded = resolveComposerTimelineInset({
      currentInset: 0,
      overlayHeight: 172,
      isResting: false,
    });
    const collapsed = resolveComposerTimelineInset({
      currentInset: expanded,
      overlayHeight: 110,
      isResting: true,
      restingOnlyHeight: 32,
    });
    expect(collapsed).toBe(expanded);
    expect(
      resolveComposerTimelineInset({
        currentInset: collapsed,
        overlayHeight: 172,
        isResting: false,
      }),
    ).toBe(expanded);
  });

  it("keeps the timeline reservation stable through notice expansion and collapse", () => {
    const collapsed = resolveComposerTimelineInset({
      currentInset: 0,
      overlayHeight: 172,
      isResting: false,
    });
    const expanded = resolveComposerTimelineInset({
      currentInset: collapsed,
      overlayHeight: 532,
      isResting: false,
      expandedNoticesHeight: 360,
    });
    expect(expanded).toBe(collapsed);
    const resting = resolveComposerTimelineInset({
      currentInset: expanded,
      overlayHeight: 470,
      isResting: true,
      expandedNoticesHeight: 360,
    });
    expect(resting).toBe(collapsed);
    expect(
      resolveComposerTimelineInset({
        currentInset: resting,
        overlayHeight: 110,
        isResting: true,
      }),
    ).toBe(collapsed);
  });
});

describe("resolveComposerRestingTransitionSettings", () => {
  it("uses a short default duration when panel animations are disabled", () => {
    expect(
      resolveComposerRestingTransitionSettings({ configuredDurationMs: 0, motionAllowed: true }),
    ).toEqual({ active: true, durationMs: 180 });
  });

  it("keeps the configured duration and respects motion suppression", () => {
    expect(
      resolveComposerRestingTransitionSettings({
        configuredDurationMs: 240,
        motionAllowed: false,
      }),
    ).toEqual({ active: false, durationMs: 240 });
  });
});

describe("resolveComposerRestingControlsArrivalTiming", () => {
  it("reveals the context-strip controls as soon as the composer collapses", () => {
    expect(
      resolveComposerRestingControlsArrivalTiming({ durationMs: 180, isCollapsing: true }),
    ).toEqual({
      durationMs: 180,
      delayMs: 0,
    });
  });

  it("starts the returning footer controls early and lets them fade for most of the expansion", () => {
    expect(
      resolveComposerRestingControlsArrivalTiming({ durationMs: 180, isCollapsing: false }),
    ).toEqual({
      durationMs: 144,
      delayMs: 36,
    });
  });
});

describe("shouldAnimateComposerContextStripArrival", () => {
  it("animates a newly visible strip as the composer collapses", () => {
    expect(
      shouldAnimateComposerContextStripArrival({
        isCollapsing: true,
        contextStripIsVisible: true,
        wasContextStripVisible: false,
      }),
    ).toBe(true);
  });

  it("keeps an already visible strip in its existing layout", () => {
    expect(
      shouldAnimateComposerContextStripArrival({
        isCollapsing: true,
        contextStripIsVisible: true,
        wasContextStripVisible: true,
      }),
    ).toBe(false);
  });

  it("does not animate a hidden strip or a first observation", () => {
    expect(
      shouldAnimateComposerContextStripArrival({
        isCollapsing: true,
        contextStripIsVisible: false,
        wasContextStripVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldAnimateComposerContextStripArrival({
        isCollapsing: true,
        contextStripIsVisible: true,
        wasContextStripVisible: null,
      }),
    ).toBe(false);
  });

  it("does not replay the entrance when the composer expands", () => {
    expect(
      shouldAnimateComposerContextStripArrival({
        isCollapsing: false,
        contextStripIsVisible: true,
        wasContextStripVisible: false,
      }),
    ).toBe(false);
  });
});

describe("context strip labels and resting composer controls", () => {
  const stripWidth = 724;
  const labelWidth = 327;
  const chromeWidth = 125;
  const measurement = {
    gap: 4,
    naturalFixedWidth: 96.3828125 + 5 + 4,
    minimumFixedWidth: 52 + 5 + 4,
    blockWidths: [130.6953125, 119.671875],
    overflowWidth: 28,
  };
  const naturalWidth = resolveRestingComposerControlsNaturalWidth(measurement);

  function hostWidth(compact: boolean): number {
    return stripWidth - chromeWidth - (compact ? 0 : labelWidth);
  }

  it("keeps the labels compact when the full controls only fit beside compact labels", () => {
    const layout = resolveRestingComposerControlsLayout({
      ...measurement,
      hostWidth: hostWidth(true),
    });
    expect(layout).toEqual({ hiddenCount: 0, visible: true });

    const compact = resolveContextStripLabelsCompact({
      compact: true,
      neededWidth: chromeWidth + labelWidth + naturalWidth,
      availableWidth: stripWidth,
    });
    expect(compact).toBe(true);

    expect(
      resolveRestingComposerControlsLayout({ ...measurement, hostWidth: hostWidth(compact) }),
    ).toEqual(layout);
  });
});

describe("resolveRestingComposerControlsLayout hysteresis", () => {
  const base = {
    gap: 4,
    naturalFixedWidth: 149,
    minimumFixedWidth: 105,
    blockWidths: [60, 140],
    overflowWidth: 24,
  };

  it("settles when the measured picker width jitters below a pixel", () => {
    // The composer re-measures on every render, so the picker's recovered
    // natural width can land a fraction of a pixel apart between renders.
    // Without hysteresis that flips hiddenCount forever.
    let layout = { hiddenCount: 0, visible: true };
    const settled: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      layout = resolveRestingComposerControlsLayout({
        ...base,
        naturalFixedWidth: index % 2 === 0 ? 149 : 149.5,
        hostWidth: 357,
        previous: layout,
      });
      if (index >= 2) settled.push(`${layout.hiddenCount}:${layout.visible}`);
    }
    expect(new Set(settled).size).toBe(1);
  });
});

describe("progressive composer controls", () => {
  const measurement = {
    gap: 4,
    naturalFixedWidth: 140,
    minimumFixedWidth: 80,
    blockWidths: [80, 140],
    iconOnlyBlockWidths: [40, 60],
    overflowWidth: 24,
  };

  it("settles through fractional label-width changes at each threshold", () => {
    for (const hostWidth of [368, 288, 248]) {
      let previous = resolveRestingComposerControlsLayout({ ...measurement, hostWidth });
      for (let index = 0; index < 10; index += 1) {
        const next = resolveRestingComposerControlsLayout({
          ...measurement,
          hostWidth,
          previous,
          naturalFixedWidth: 140 + (index % 2) * 0.5,
        });
        if (index > 1) expect(next).toEqual(previous);
        previous = next;
      }
    }
  });
});
