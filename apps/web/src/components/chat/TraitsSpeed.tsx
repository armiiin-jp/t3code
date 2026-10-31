import type { ProviderDriverKind, ProviderOptionDescriptor } from "@t3tools/contracts";
import { getServiceTierSpeedDisplay } from "@t3tools/client-runtime/model-traits";
import { ZapIcon } from "lucide-react";
import { UltrafastIcon } from "../Icons";
import { cn } from "~/lib/utils";
import { ComposerControlIcon, type ComposerControlSize } from "./ComposerControl";

export function getTraitsSpeedDisplay(
  provider: ProviderDriverKind,
  descriptor: ProviderOptionDescriptor,
): { label: string; speedIcon: "fast" | "ultrafast" | null } | null {
  if (descriptor.id === "fastMode" && descriptor.type === "boolean") {
    return {
      label: descriptor.currentValue === true ? "Fast" : "Normal",
      speedIcon: descriptor.currentValue === true ? "fast" : null,
    };
  }
  const display = getServiceTierSpeedDisplay(provider, descriptor);
  return display ? { label: display.label, speedIcon: display.speedIcon } : null;
}

export function TraitsSpeedIcon({
  provider,
  speedIcon,
  size = "sm",
}: {
  provider: ProviderDriverKind;
  speedIcon: "fast" | "ultrafast";
  size?: ComposerControlSize;
}) {
  return (
    <>
      <ComposerControlIcon
        icon={speedIcon === "ultrafast" ? UltrafastIcon : ZapIcon}
        size={size}
        className={cn(
          "fill-current opacity-80",
          size === "xs"
            ? "text-current"
            : provider === "claudeAgent"
              ? "text-[#d97757]"
              : "text-foreground",
        )}
      />
      <span className="sr-only">
        {speedIcon === "ultrafast" ? "Ultrafast mode on" : "Fast mode on"}
      </span>
    </>
  );
}
