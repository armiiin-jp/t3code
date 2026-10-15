import { describe, expect, it } from "vite-plus/test";
import { detectTextDirection, isLtrChar, isRtlChar } from "./bidi";

describe("bidi text direction detection", () => {
  it("detects pure Persian as RTL", () => {
    expect(detectTextDirection("سلام دنیا")).toBe("rtl");
    expect(detectTextDirection("این یک متن فارسی ساده است.")).toBe("rtl");
    expect(detectTextDirection("پروژه‌های نرم‌افزاری با کیفیت بالا")).toBe("rtl");
  });

  it("detects pure English as LTR", () => {
    expect(detectTextDirection("Hello world")).toBe("ltr");
    expect(detectTextDirection("This is a simple English sentence.")).toBe("ltr");
    expect(detectTextDirection("Software engineering best practices")).toBe("ltr");
  });

  it("detects Persian sentences with adjacent English words as RTL", () => {
    expect(detectTextDirection("سلام Hello دنیا")).toBe("rtl");
    expect(detectTextDirection("این یک تست برای نرم‌افزار T3 Code است.")).toBe("rtl");
    expect(detectTextDirection("کلمه test به معنی آزمایش است.")).toBe("rtl");
    expect(detectTextDirection("در React و TypeScript و Tailwind توسعه داده شده است.")).toBe("rtl");
  });

  it("detects Persian sentences starting with English words / commands / acronyms as RTL", () => {
    // Technical terms or commands opening a Persian sentence
    expect(detectTextDirection("npm test را در ترمینال اجرا کن.")).toBe("rtl");
    expect(detectTextDirection("git status برای دیدن تغییرات استفاده می‌شود.")).toBe("rtl");
    expect(detectTextDirection("API جدید برای احراز هویت اضافه شد.")).toBe("rtl");
    expect(detectTextDirection("Docker برای مدیریت کانتینرها به کار می‌رود.")).toBe("rtl");
    expect(detectTextDirection("T3 Code یک ابزار بسیار عالی است.")).toBe("rtl");
  });

  it("detects English sentences with embedded Persian words as LTR", () => {
    expect(detectTextDirection("The Persian greeting is سلام and goodbye is خداحافظ.")).toBe("ltr");
    expect(detectTextDirection("Use the word تست for testing in Persian.")).toBe("ltr");
    expect(detectTextDirection("He said سلام to his friends.")).toBe("ltr");
  });

  it("detects short mixed phrases based on first strong character", () => {
    expect(detectTextDirection("سلام World")).toBe("rtl");
    expect(detectTextDirection("World سلام")).toBe("ltr");
  });

  it("ignores markdown syntax, code fences, and leading bullets", () => {
    expect(detectTextDirection("# سلام دنیا")).toBe("rtl");
    expect(detectTextDirection("## Heading in English")).toBe("ltr");
    expect(detectTextDirection("- [ ] وظیفه اول را انجام دهید")).toBe("rtl");
    expect(detectTextDirection("> این یک نقل‌قول فارسی است")).toBe("rtl");
    expect(detectTextDirection("`npm install` را اجرا کنید")).toBe("rtl");
  });

  it("returns auto for neutral or empty strings", () => {
    expect(detectTextDirection("")).toBe("auto");
    expect(detectTextDirection("   ")).toBe("auto");
    expect(detectTextDirection("123456")).toBe("auto");
    expect(detectTextDirection("---")).toBe("auto");
    expect(detectTextDirection("!@#$%^&*()")).toBe("auto");
  });

  it("identifies individual characters correctly", () => {
    expect(isRtlChar("س")).toBe(true);
    expect(isRtlChar("پ")).toBe(true);
    expect(isRtlChar("چ")).toBe(true);
    expect(isRtlChar("ژ")).toBe(true);
    expect(isRtlChar("گ")).toBe(true);
    expect(isRtlChar("ی")).toBe(true);
    expect(isRtlChar("a")).toBe(false);
    expect(isRtlChar("1")).toBe(false);

    expect(isLtrChar("a")).toBe(true);
    expect(isLtrChar("Z")).toBe(true);
    expect(isLtrChar("س")).toBe(false);
    expect(isLtrChar("1")).toBe(false);
  });
});
