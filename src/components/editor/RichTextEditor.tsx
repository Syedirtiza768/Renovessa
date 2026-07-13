"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef } from "react";
import { MergeFieldNode } from "./MergeFieldNode";
import { EditorToolbar } from "./EditorToolbar";

interface Props {
  initialHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

/**
 * TipTap-based rich text editor for composing HTML emails.
 * Supports formatting, links, images, and {{token}} merge fields.
 */
export function RichTextEditor({ initialHtml, onChange, placeholder }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || "Write your email…" }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-copper underline" } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      MergeFieldNode,
    ],
    content: initialHtml || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!onChange) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(ed.getHTML());
      }, 150);
    },
  });

  // Sync initialHtml when it changes externally (e.g. loading a template).
  const prevInitial = useRef(initialHtml);
  useEffect(() => {
    if (editor && initialHtml !== prevInitial.current) {
      prevInitial.current = initialHtml;
      if (initialHtml && editor.getHTML() !== initialHtml) {
        editor.commands.setContent(initialHtml, { emitUpdate: false });
      }
    }
  }, [editor, initialHtml]);

  const insertField = useCallback(
    (field: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({ type: "mergeField", attrs: { field } })
        .run();
    },
    [editor]
  );

  return (
    <div className="overflow-hidden rounded-md border border-rule bg-white">
      <EditorToolbar editor={editor} onInsertField={insertField} />
      <EditorContent editor={editor} />
    </div>
  );
}
