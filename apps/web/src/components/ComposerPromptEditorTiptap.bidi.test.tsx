// @vitest-environment jsdom

import type { Editor } from "@tiptap/core";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { ComposerPromptEditor, type ComposerPromptEditorHandle } from "./ComposerPromptEditor";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mountEditor(value: string = "", richTextEnabled = true) {
  await act(async () =>
    root.render(
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
    ),
  );
  const element = container.querySelector<HTMLElement & { editor: Editor }>(".tiptap");
  if (!element) throw new Error("Composer did not mount");
  return element.editor;
}

describe("ComposerPromptEditor RTL and bidirectional support", () => {
  it("renders editor container with dir='auto'", async () => {
    await mountEditor();
    const tiptapElem = container.querySelector(".tiptap");
    expect(tiptapElem?.getAttribute("dir")).toBe("auto");
  });

  it("assigns dir='rtl' when Persian text is typed into composer", async () => {
    const editor = await mountEditor();
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("سلام دنیا! این یک متن تستی است."));
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.dir).toBe("rtl");

    const domP = container.querySelector(".tiptap p");
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='ltr' when English text is typed into composer", async () => {
    const editor = await mountEditor();
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("Hello world! This is English text."));
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.dir).toBe("ltr");

    const domP = container.querySelector(".tiptap p");
    expect(domP?.getAttribute("dir")).toBe("ltr");
  });

  it("assigns dir='rtl' for Persian text with adjacent English words", async () => {
    const editor = await mountEditor();
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("این یک تست برای نرم‌افزار T3 Code است."));
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.dir).toBe("rtl");

    const domP = container.querySelector(".tiptap p");
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='rtl' for Persian sentences starting with English commands or acronyms", async () => {
    const editor = await mountEditor();
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("npm test را در ترمینال اجرا کنید"));
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.dir).toBe("rtl");

    const domP = container.querySelector(".tiptap p");
    expect(domP?.getAttribute("dir")).toBe("rtl");
  });

  it("assigns dir='ltr' for English sentences containing Persian words", async () => {
    const editor = await mountEditor();
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("The Persian word سلام means hello"));
    });

    const firstNode = editor.state.doc.child(0);
    expect(firstNode.attrs.dir).toBe("ltr");

    const domP = container.querySelector(".tiptap p");
    expect(domP?.getAttribute("dir")).toBe("ltr");
  });
});
