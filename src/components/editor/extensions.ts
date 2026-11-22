/**
 * Single source of truth for the editor's TipTap extensions.
 * (Kept separate so server-side code, e.g. HTML export, could reuse the same schema later.)
 */
import StarterKit from "@tiptap/starter-kit"; // includes headings, lists, bold/italic/underline, undo/redo
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";

export function getEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
