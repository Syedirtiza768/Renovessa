import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

/** Renders a merge-field chip inside the editor. */
function MergeFieldComponent({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        contentEditable={false}
        className="inline-flex items-center gap-1 rounded-full bg-blueprint px-2 py-0.5 text-xs font-medium text-copper select-none"
        style={{ verticalAlign: "baseline" }}
      >
        {`{{${node.attrs.field}}}`}
      </span>
    </NodeViewWrapper>
  );
}

/** Custom TipTap node for {{token}} merge fields. */
export const MergeFieldNode = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      field: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-merge-field": "" }), `{{${HTMLAttributes.field}}}`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeFieldComponent);
  },
});
