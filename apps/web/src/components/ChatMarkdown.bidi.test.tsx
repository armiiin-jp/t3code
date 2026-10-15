import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import ChatMarkdown from "./ChatMarkdown";

describe("ChatMarkdown RTL support and bidirectional text layout", () => {
  it("renders pure Persian paragraph with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown cwd={undefined} text="سلام دنیا! این یک متن فارسی است." />,
    );
    expect(html).toContain('<p dir="rtl">');
    expect(html).toContain("سلام دنیا! این یک متن فارسی است.");
  });

  it("renders pure English paragraph without dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown cwd={undefined} text="Hello world! This is plain English." />,
    );
    expect(html).not.toContain('dir="rtl"');
    expect(html).toContain("<p>");
  });

  it("renders Persian sentences with adjacent English words with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text="این یک تست برای نرم‌افزار T3 Code است تا اطمینان حاصل شود ترتیب کلمات به هم نمی‌ریزد."
      />,
    );
    expect(html).toContain('<p dir="rtl">');
  });

  it("renders Persian sentences starting with English commands or acronyms with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text={`npm test را در ترمینال اجرا کنید تا نتایج مشاهده شود.\n\nAPI جدید برای ارتباط با سرور توسعه یافت.`}
      />,
    );
    const paragraphs = [...html.matchAll(/<p[^>]*>/g)].map((m) => m[0]);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toContain('dir="rtl"');
    expect(paragraphs[1]).toContain('dir="rtl"');
  });

  it("renders English sentences with embedded Persian words as LTR", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text="The Persian greeting is سلام and it is commonly used every day."
      />,
    );
    expect(html).not.toContain('dir="rtl"');
    expect(html).toContain("<p>");
  });

  it("renders Persian headings with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown cwd={undefined} text="# راهنمای نصب و راه‌اندازی" />,
    );
    expect(html).toContain('dir="rtl">راهنمای نصب و راه‌اندازی</h1>');
  });

  it("renders Persian list items with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text={`- مورد اول: نصب پیش‌نیازها\n- مورد دوم: تنظیم متغیرهای محیطی\n- مورد سوم: اجرای سرور`}
      />,
    );
    const items = [...html.matchAll(/<li[^>]*>/g)].map((m) => m[0]);
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toContain('dir="rtl"');
    }
  });

  it("renders Persian blockquotes with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown cwd={undefined} text="> توجه: لطفا فایل تنظیمات را پاک نکنید." />,
    );
    expect(html).toContain('<blockquote dir="rtl">');
  });

  it("renders Persian GitHub alert with dir='rtl'", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown cwd={undefined} text={"> [!NOTE]\n> این یک پیام هشدار مهم است."} />,
    );
    expect(html).toContain('<div role="note" dir="rtl"');
  });

  it("ensures inline code maintains dir='ltr' even inside Persian paragraphs", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text="برای شروع کار دستور `git checkout feature/rtl-support` را وارد کنید."
      />,
    );
    expect(html).toContain('<p dir="rtl">');
    expect(html).toContain('dir="ltr">git checkout feature/rtl-support</code>');
  });

  it("maintains code blocks in standard LTR layout", () => {
    const html = renderToStaticMarkup(
      <ChatMarkdown
        cwd={undefined}
        text={
          "کد زیر را مشاهده کنید:\n\n```ts\nconst greeting = 'سلام';\nconsole.log(greeting);\n```"
        }
      />,
    );
    expect(html).toContain('<p dir="rtl">');
    expect(html).toContain('class="chat-markdown-codeblock');
  });
});
