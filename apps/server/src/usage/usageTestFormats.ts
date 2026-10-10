/**
 * The built-in transcript formats by provider, for engine and cache tests.
 *
 * @module usageTestFormats
 */
import type { UsageProviderKind } from "@t3tools/contracts";
import type { TranscriptUsageFormat } from "@t3tools/provider-core/server/usage";
import { grokUsageFormat } from "@t3tools/provider-grok/server/usage";

import { claudeUsageFormat } from "../provider/Drivers/claudeUsage.ts";
import { codexUsageFormat, gapCodeUsageFormat } from "../provider/Drivers/codexUsage.ts";

export const TEST_FORMATS: Record<
  "claude" | "codex" | "gapcode" | "grok",
  TranscriptUsageFormat<unknown>
> = {
  claude: claudeUsageFormat,
  codex: codexUsageFormat,
  gapcode: gapCodeUsageFormat,
  grok: grokUsageFormat,
};

export const TEST_FORMAT_MAP = new Map<UsageProviderKind, TranscriptUsageFormat<unknown>>(
  Object.entries(TEST_FORMATS) as Array<[UsageProviderKind, TranscriptUsageFormat<unknown>]>,
);
