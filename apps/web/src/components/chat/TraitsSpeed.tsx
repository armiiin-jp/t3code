import type { ProviderDriverKind, ProviderOptionDescriptor } from "@t3tools/contracts";
import { getServiceTierSpeedDisplay } from "@t3tools/client-runtime/model-traits";
import { msg, T } from "gt-react";
import { ZapIcon } from "lucide-react";
import { m, type MessageResolver } from "~/i18n/messages";
import { UltrafastIcon } from "../Icons";
import { cn } from "~/lib/utils";
import { ComposerControlIcon, type ComposerControlSize } from "./ComposerControl";

export function getTraitsSpeedDisplay(
  descriptor: ProviderOptionDescriptor,
  resolve: MessageResolver = m,
): { label: string; speedIcon: "fast" | "ultrafast" | null } | null {
  if (descriptor.id === "fastMode" && descriptor.type === "boolean") {
    return {
      label:
        descriptor.currentValue === true
          ? resolve(msg("Fast", { $context: "model speed" }))
          : resolve(msg("Normal", { $context: "model speed" })),
      speedIcon: descriptor.currentValue === true ? "fast" : null,
    };
  }
  const display = getServiceTierSpeedDisplay(descriptor);
  if (!display) return null;
  const label = display.speedLabel
    ? resolve(msg(display.speedLabel, { $context: "model speed" }))
    : resolve(msg("Normal", { $context: "model speed" }));
  return { label, speedIcon: display.speedIcon };
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
        {speedIcon === "ultrafast" ? <T>Ultrafast mode on</T> : <T>Fast mode on</T>}
      </span>
    </>
  );
}
