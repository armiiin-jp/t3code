import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { detectTextDirection, type TextDirection } from "~/lib/bidi";

export const DIRECTION_NODE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "taskItem",
  "bulletList",
  "orderedList",
  "taskList",
] as const;

/**
 * Creates the ProseMirror plugin that checks block content changes and assigns
 * proper "dir" attribute to ensure correct bidirectional layout (RTL vs LTR).
 */
export function createComposerTextDirectionPlugin() {
  return new Plugin({
    key: new PluginKey("composerTextDirectionPlugin"),
    appendTransaction: (transactions, _oldState, newState) => {
      if (!transactions.some((tr) => tr.docChanged)) return null;

      let tr = newState.tr;
      let modified = false;

      newState.doc.descendants((node, pos) => {
        if (
          !DIRECTION_NODE_TYPES.includes(node.type.name as (typeof DIRECTION_NODE_TYPES)[number])
        ) {
          return;
        }
        const text = node.textContent;
        const detected = detectTextDirection(text);
        const targetDir: TextDirection | null = detected === "auto" ? null : detected;
        if (node.attrs.dir !== targetDir) {
          const marks = tr.storedMarks ?? [];
          tr.setNodeAttribute(pos, "dir", targetDir);
          for (const mark of marks) {
            tr.addStoredMark(mark);
          }
          modified = true;
        }
      });

      if (modified) {
        tr.setMeta("addToHistory", false);
        return tr;
      }
      return null;
    },
  });
}

/**
 * Tiptap extension that dynamically detects text direction (RTL vs LTR)
 * per block as the user writes or pastes content.
 *
 * Ensures mixed Persian and English blocks receive appropriate bidirectional
 * layout without manual toggles.
 */
export const ComposerTextDirectionExtension = Extension.create({
  name: "composerTextDirection",

  addGlobalAttributes() {
    return [
      {
        types: [...DIRECTION_NODE_TYPES],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir"),
            renderHTML: (attributes) => {
              if (!attributes.dir) return {};
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [createComposerTextDirectionPlugin()];
  },
});
