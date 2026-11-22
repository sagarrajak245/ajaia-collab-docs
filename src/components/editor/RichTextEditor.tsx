"use client";
/** TipTap editor + toolbar on a white "page". Content changes are reported as JSON. */
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { EditorContent as DocContent } from "@/types/domain";
import { getEditorExtensions } from "./extensions";
import { Toolbar } from "./Toolbar";

interface Props {
  initialContent: DocContent;
  editable: boolean;
  onChange: (content: DocContent) => void;
  /** Exposes the editor instance (for future export/comments features). */
  onReady?: (editor: Editor) => void;
}

export function RichTextEditor({ initialContent, editable, onChange, onReady }: Props) {
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent,
    editable,
    immediatelyRender: false, // avoid SSR hydration mismatch in Next.js
    onCreate: ({ editor: e }) => onReady?.(e),
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as DocContent),
    editorProps: { attributes: { "aria-label": "Document content", role: "textbox", "aria-multiline": "true" } },
  });

  return (
    <>
      {/* Viewers get no toolbar at all */}
      {editable && editor && <Toolbar editor={editor} />}
      <div className="print-canvas flex-1 bg-slate-100 px-2 py-6 sm:px-4 sm:py-8">
        <div className="print-page mx-auto min-h-[1056px] w-full max-w-[816px] bg-paper px-6 py-10 shadow-md sm:px-[72px] sm:py-[72px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
