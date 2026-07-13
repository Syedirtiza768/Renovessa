"use client";

import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
  onInsertField: (field: string) => void;
}

const BUTTON_CLASS =
  "rounded px-2 py-1 text-sm font-medium text-slate hover:bg-blueprint transition-colors disabled:opacity-40";
const ACTIVE_CLASS = "bg-blueprint text-copper";

function Btn({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON_CLASS} ${active ? ACTIVE_CLASS : ""}`}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, onInsertField }: Props) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-rule p-2">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <strong>B</strong>
      </Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <em>I</em>
      </Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <u>U</u>
      </Btn>

      <span className="mx-1 h-5 w-px bg-rule" />

      <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        H1
      </Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        H2
      </Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        H3
      </Btn>

      <span className="mx-1 h-5 w-px bg-rule" />

      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        &bull; List
      </Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        1. List
      </Btn>
      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        &ldquo;
      </Btn>

      <span className="mx-1 h-5 w-px bg-rule" />

      <Btn
        onClick={() => {
          const url = window.prompt("Link URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        active={editor.isActive("link")}
        title="Insert link"
      >
        🔗
      </Btn>
      <Btn
        onClick={() => {
          const url = window.prompt("Image URL:");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        title="Insert image"
      >
        🖼
      </Btn>

      <span className="mx-1 h-5 w-px bg-rule" />

      {/* Merge field dropdown */}
      <select
        className="input w-auto text-xs"
        value=""
        onChange={(e) => {
          if (e.target.value) {
            onInsertField(e.target.value);
            e.target.value = "";
          }
        }}
      >
        <option value="">Insert field…</option>
        <option value="greetingName">Greeting name</option>
        <option value="companyName">Company name</option>
        <option value="tradeLabel">Trade label</option>
        <option value="city">City</option>
        <option value="rating">Rating</option>
        <option value="reviewCount">Review count</option>
        <option value="ratingLine">Rating line</option>
        <option value="ratingMath">Rating math</option>
        <option value="agentName">Agent name</option>
        <option value="firstName">First name</option>
        <option value="reference">Reference #</option>
      </select>
    </div>
  );
}
