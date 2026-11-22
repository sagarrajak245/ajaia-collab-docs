/**
 * TipTap Mark that anchors a comment thread to a text range.
 * Stored in document JSON as a `comment` mark with a `commentId` attribute, so
 * the anchor travels with the text through edits and is saved by autosave.
 */
import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      /** Wrap the current selection in a comment mark. */
      setComment: (commentId: string) => ReturnType;
      /** Remove every mark with this id across the whole document. */
      unsetComment: (commentId: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: "comment",
  // Typing at the edge of an anchor should not extend it.
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) => (attrs.commentId ? { "data-comment-id": attrs.commentId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "comment-anchor" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setComment:
        (commentId) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId }),

      unsetComment:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          const type = state.schema.marks[this.name];
          state.doc.descendants((node, pos) => {
            node.marks.forEach((m) => {
              if (m.type === type && m.attrs.commentId === commentId) {
                tr.removeMark(pos, pos + node.nodeSize, m);
              }
            });
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
