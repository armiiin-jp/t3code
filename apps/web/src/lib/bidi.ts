/**
 * Text direction and bidirectional (BiDi) utilities.
 *
 * Implements robust direction detection optimized for mixed RTL (Persian, Arabic, Hebrew)
 * and LTR (English, Latin) content, such as technical sentences mixing Persian prose with
 * English commands, library names, and code tokens.
 */

export type TextDirection = "rtl" | "ltr" | "auto";

/**
 * Unicode ranges for Right-to-Left scripts:
 * - Hebrew: \u0590-\u05FF, \uFB1D-\uFB4F
 * - Arabic / Persian / Urdu: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFC
 * - Syriac: \u0700-\u074F
 * - Thaana: \u0780-\u07BF
 */
const RTL_REGEX =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFC]/;

/**
 * Unicode ranges for Left-to-Right scripts (Latin, Greek, Cyrillic, etc.).
 */
const LTR_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;

/**
 * Checks if a character is a strong RTL character.
 */
export function isRtlChar(char: string): boolean {
  return RTL_REGEX.test(char);
}

/**
 * Checks if a character is a strong LTR character.
 */
export function isLtrChar(char: string): boolean {
  return LTR_REGEX.test(char);
}

/**
 * Determines text direction based on content.
 *
 * Handles mixed Persian/Arabic and English sentences according to Unicode BiDi best practices:
 * 1. If text starts with an RTL character -> "rtl".
 * 2. If text starts with an LTR character (common when Persian technical sentences begin with
 *    command names, library names, or acronyms like "git status را اجرا کن" or "API جدید ساخته شد"):
 *    - If RTL characters outnumber LTR characters, the sentence is classified as "rtl" so adjacent
 *      English words and trailing punctuation retain correct Persian reading order.
 *    - Otherwise -> "ltr".
 * 3. If no strong directional characters are found -> "auto".
 */
export function detectTextDirection(text: string | null | undefined): TextDirection {
  if (!text || !text.trim()) {
    return "auto";
  }

  // Strip fenced code blocks and inline code spans so code content does not bias block direction
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    // Strip leading markdown prefixes (headings, list markers, quotes, task checkboxes)
    .replace(/^[\s#>*-]+(?:\s+\[[ xX]\])?\s*/gm, "");

  let rtlCount = 0;
  let ltrCount = 0;
  let firstStrong: "rtl" | "ltr" | null = null;

  for (const char of cleaned) {
    if (isRtlChar(char)) {
      rtlCount++;
      if (!firstStrong) firstStrong = "rtl";
    } else if (isLtrChar(char)) {
      ltrCount++;
      if (!firstStrong) firstStrong = "ltr";
    }
  }

  if (firstStrong === "rtl") {
    return "rtl";
  }

  if (firstStrong === "ltr") {
    // If text starts with LTR (e.g. leading technical term in Persian sentence)
    if (rtlCount > ltrCount) {
      return "rtl";
    }
    return "ltr";
  }

  return "auto";
}
