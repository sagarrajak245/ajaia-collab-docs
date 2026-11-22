"use client";
/** Formatting toolbar. Reads editor state via useEditorState so active styles stay in sync. */
import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";

const TEXT_COLORS = [
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
  { name: "Gray", value: "#64748b" },
  { name: "Black", value: "#0f172a" },
];

const HIGHLIGHTS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Purple", value: "#e9d5ff" },
];

function Btn(props: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      // mouseDown preventDefault keeps the editor selection when clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        props.active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {props.children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />;

function Swatches(props: {
  group: string;
  colors: { name: string; value: string }[];
  current?: string | null;
  onPick: (v: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div role="group" aria-label={props.group} className="flex items-center gap-1">
      {props.colors.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={`${props.group}: ${c.name}`}
          title={c.name}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => props.onPick(c.value)}
          style={{ backgroundColor: c.value }}
          className={`h-5 w-5 rounded-full border border-slate-300 ${
            props.current === c.value ? "ring-2 ring-blue-500 ring-offset-1" : ""
          }`}
        />
      ))}
      <Btn label={props.clearLabel} onClick={props.onClear}>
        <span aria-hidden>✕</span>
      </Btn>
    </div>
  );
}

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      p: e.isActive("paragraph"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      inTable: e.isActive("table"),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (e.getAttributes("highlight").color as string | undefined) ?? null,
    }),
  });
  const run = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5 shadow-sm"
    >
      <Btn label="Undo" disabled={!s.canUndo} onClick={() => run().undo().run()}>↶</Btn>
      <Btn label="Redo" disabled={!s.canRedo} onClick={() => run().redo().run()}>↷</Btn>
      <Divider />
      <Btn label="Paragraph" active={s.p} onClick={() => run().setParagraph().run()}>¶</Btn>
      <Btn label="Heading 1" active={s.h1} onClick={() => run().toggleHeading({ level: 1 }).run()}>H1</Btn>
      <Btn label="Heading 2" active={s.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={s.h3} onClick={() => run().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <Divider />
      <Btn label="Bold" active={s.bold} onClick={() => run().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italic" active={s.italic} onClick={() => run().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Underline" active={s.underline} onClick={() => run().toggleUnderline().run()}><u>U</u></Btn>
      <Divider />
      <Btn label="Bullet list" active={s.bullet} onClick={() => run().toggleBulletList().run()}>•≡</Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => run().toggleOrderedList().run()}>1.≡</Btn>
      <Divider />
      <Swatches
        group="Text color"
        colors={TEXT_COLORS}
        current={s.color}
        onPick={(v) => run().setColor(v).run()}
        onClear={() => run().unsetColor().run()}
        clearLabel="Reset text color"
      />
      <Divider />
      <Swatches
        group="Highlight"
        colors={HIGHLIGHTS}
        current={s.highlight}
        onPick={(v) => run().setHighlight({ color: v }).run()}
        onClear={() => run().unsetHighlight().run()}
        clearLabel="No highlight"
      />
      <Divider />
      <Btn label="Insert table" onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</Btn>
      <Btn label="Add row" disabled={!s.inTable} onClick={() => run().addRowAfter().run()}>+Row</Btn>
      <Btn label="Delete row" disabled={!s.inTable} onClick={() => run().deleteRow().run()}>−Row</Btn>
      <Btn label="Add column" disabled={!s.inTable} onClick={() => run().addColumnAfter().run()}>+Col</Btn>
      <Btn label="Delete column" disabled={!s.inTable} onClick={() => run().deleteColumn().run()}>−Col</Btn>
      <Btn label="Delete table" disabled={!s.inTable} onClick={() => run().deleteTable().run()}>🗑</Btn>
    </div>
  );
}
