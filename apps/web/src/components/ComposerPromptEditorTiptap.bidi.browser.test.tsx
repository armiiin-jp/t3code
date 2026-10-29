import type { Editor } from "@tiptap/core";
import { createRef } from "react";
import { describe, expect, it } from "vite-plus/test";

import { act, render } from "../../test/render";

import {
  ComposerPromptEditorTiptap as ComposerPromptEditor,
  type ComposerPromptEditorHandle,
} from "./ComposerPromptEditorTiptap";

async function mountEditor(value: string = "", richTextEnabled = true) {
  const screen = await render(
    <ComposerPromptEditor
      editorRef={createRef<ComposerPromptEditorHandle>()}
      value={value}
      cursor={0}
      richTextEnabled={richTextEnabled}
      contextRecords={new Map()}
      skills={[]}
      disabled={false}
      placeholder="Type a message..."
      onChange={() => {}}
      onPaste={() => {}}
    />,
  );
  const element = screen.container.querySelector<HTMLElement & { editor: Editor }>(".tiptap");
  if (!element) throw new Error("Composer did not mount");
  return Object.assign(screen, { editor: element.editor });
}

describe("ComposerPromptEditor RTL and bidirectional support", () => {
  it("renders editor container with dir='auto'", async () => {
    await using screen = await mountEditor();
    const tiptapElem = screen.container.querySelector(".tiptap");
    expect(tiptapElem?.getAttribute("dir")).toBe("auto");
  });

  it("assigns dir='rtl' when Persian text is typed into composer", async () => {
    await using screen = await mountEditor();
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("سلام دنیا! این یک متن تستی است."));
    });

    const domP = screen.container.querySelector(".tiptap p");
    expect(editor.state.doc.child(0).isTextblock).toBe(true);
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='ltr' when English text is typed into composer", async () => {
    await using screen = await mountEditor();
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("Hello world! This is English text."));
    });

    const domP = screen.container.querySelector(".tiptap p");
    expect(editor.state.doc.child(0).isTextblock).toBe(true);
    expect(domP?.getAttribute("dir")).toBe("ltr");
  });

  it("assigns dir='rtl' for Persian text with adjacent English words", async () => {
    await using screen = await mountEditor();
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("این یک تست برای نرم‌افزار T3 Code است."));
    });

    const domP = screen.container.querySelector(".tiptap p");
    expect(editor.state.doc.child(0).isTextblock).toBe(true);
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='rtl' for Persian sentences starting with English commands or acronyms", async () => {
    await using screen = await mountEditor();
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("npm test را در ترمینال اجرا کنید"));
    });

    const domP = screen.container.querySelector(".tiptap p");
    expect(editor.state.doc.child(0).isTextblock).toBe(true);
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='ltr' for English sentences containing Persian words", async () => {
    await using screen = await mountEditor();
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("The Persian word سلام means hello"));
    });

    const domP = screen.container.querySelector(".tiptap p");
    expect(editor.state.doc.child(0).isTextblock).toBe(true);
    expect(domP?.getAttribute("dir")).toBe("ltr");
  });

  it("assigns dir='rtl' to blockquote when mounted with RTL text", async () => {
    await using screen = await mountEditor("> سلام دنیا");
    const blockquote = screen.container.querySelector(".tiptap blockquote");
    expect(blockquote).not.toBeNull();
    expect(blockquote?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='rtl' to ordered list and list item with RTL text", async () => {
    await using screen = await mountEditor("1. سلام دنیا");
    const ol = screen.container.querySelector(".tiptap ol");
    expect(ol).not.toBeNull();
    expect(ol?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='rtl' to bullet list and list item with RTL text", async () => {
    await using screen = await mountEditor("- سلام دنیا");
    const ul = screen.container.querySelector(".tiptap ul");
    expect(ul).not.toBeNull();
    expect(ul?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='rtl' to heading with RTL text", async () => {
    await using screen = await mountEditor("# سلام دنیا");
    const h1 = screen.container.querySelector(".tiptap h1");
    expect(h1).not.toBeNull();
    expect(h1?.getAttribute("dir")).toBe("rtl");
  });

  it("dynamically updates dir='rtl' when typing RTL text into a blockquote", async () => {
    await using screen = await mountEditor("> ");
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("سلام دنیا"));
    });
    const blockquote = screen.container.querySelector(".tiptap blockquote");
    expect(blockquote?.getAttribute("dir")).toBe("rtl");
  });

  it("dynamically updates dir='rtl' when typing RTL text into an ordered list", async () => {
    await using screen = await mountEditor("1. ");
    const editor = screen.editor;
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("آیتم اول"));
    });
    const ol = screen.container.querySelector(".tiptap ol");
    expect(ol?.getAttribute("dir")).toBe("rtl");
  });
});
