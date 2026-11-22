"use client";
/**
 * Comments sidebar. Threads are anchored to text through the editor's `comment`
 * mark (editors/owners) or just carry a quote (viewers cannot persist marks,
 * because saving content requires edit rights).
 */
import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommentDto } from "@/types/domain";

interface Props {
  documentId: string;
  editor: Editor | null;
  canEdit: boolean;
  currentUserId: string | null;
  isOwner: boolean;
}

/** Highlight style for anchored text lives here so no global stylesheet is touched. */
const ANCHOR_CSS = `
.comment-anchor { background: #fef08a; border-bottom: 2px solid #eab308; cursor: pointer; }
.comment-anchor.comment-active { background: #fde047; outline: 2px solid #eab308; }
`;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json.data as T;
}

export function CommentsPanel({ documentId, editor, canEdit, currentUserId, isOwner }: Props) {
  const base = `/api/documents/${documentId}/comments`;
  const [items, setItems] = useState<CommentDto[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await api<CommentDto[]>(base));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const { roots, repliesOf } = useMemo(() => {
    const map = new Map<string, CommentDto[]>();
    for (const c of items) if (c.parentId) map.set(c.parentId, [...(map.get(c.parentId) ?? []), c]);
    return { roots: items.filter((c) => !c.parentId), repliesOf: map };
  }, [items]);

  // Mirror the active thread onto the anchored text in the editor DOM.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom as HTMLElement;
    dom.querySelectorAll(".comment-active").forEach((el) => el.classList.remove("comment-active"));
    if (activeAnchor) dom.querySelectorAll(`[data-comment-id="${CSS.escape(activeAnchor)}"]`).forEach((el) => el.classList.add("comment-active"));
  }, [editor, activeAnchor, items]);

  const selectionQuote = () => {
    if (!editor) return "";
    const { from, to, empty } = editor.state.selection;
    return empty ? "" : editor.state.doc.textBetween(from, to, " ").slice(0, 500);
  };

  async function addComment() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    const quote = selectionQuote();
    // Only editors can persist a mark; viewers get a quote-only comment.
    const anchorId = canEdit && quote && editor ? crypto.randomUUID() : undefined;
    try {
      await api<CommentDto>(base, {
        method: "POST",
        body: JSON.stringify({ body, quote: quote || undefined, anchorId }),
      });
      if (anchorId) editor?.chain().focus().setComment(anchorId).run(); // autosave persists it
      setDraft("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reply(parentId: string) {
    const body = replyText.trim();
    if (!body) return;
    try {
      await api(base, { method: "POST", body: JSON.stringify({ body, parentId }) });
      setReplyTo(null);
      setReplyText("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleResolved(c: CommentDto) {
    try {
      await api(`${base}/${c.id}`, { method: "PATCH", body: JSON.stringify({ resolved: !c.resolved }) });
      // Resolving drops the highlight; reopening does not restore it (the text is no longer marked).
      if (!c.resolved && c.anchorId && canEdit) editor?.commands.unsetComment(c.anchorId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(c: CommentDto) {
    try {
      await api(`${base}/${c.id}`, { method: "DELETE" });
      if (!c.parentId && c.anchorId && canEdit) editor?.commands.unsetComment(c.anchorId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Scroll to and select the anchored text for a thread. */
  function focusThread(c: CommentDto) {
    if (!c.anchorId || !editor) return;
    setActiveAnchor(c.anchorId);
    let range: { from: number; to: number } | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.marks.some((m) => m.type.name === "comment" && m.attrs.commentId === c.anchorId)) {
        range = { from: range?.from ?? pos, to: pos + node.nodeSize };
      }
    });
    if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  }

  const open = roots.filter((c) => !c.resolved);
  const resolved = roots.filter((c) => c.resolved);

  const renderThread = (c: CommentDto) => (
    <li
      key={c.id}
      className={`rounded border p-2 text-sm ${activeAnchor && activeAnchor === c.anchorId ? "border-yellow-500" : "border-gray-200"}`}
    >
      {c.quote && (
        <button
          type="button"
          onClick={() => focusThread(c)}
          className="mb-1 block w-full truncate border-l-2 border-yellow-400 pl-2 text-left text-xs text-gray-500"
          title={c.anchorId ? "Go to text" : "Highlight not saved for this comment"}
        >
          {c.quote}
        </button>
      )}
      <Entry c={c} canDelete={c.author.id === currentUserId || isOwner} onDelete={() => remove(c)} />
      {(repliesOf.get(c.id) ?? []).map((r) => (
        <div key={r.id} className="mt-2 ml-3 border-l pl-2">
          <Entry c={r} canDelete={r.author.id === currentUserId || isOwner} onDelete={() => remove(r)} />
        </div>
      ))}
      <div className="mt-2 flex gap-3 text-xs">
        <button type="button" className="text-blue-600" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
          Reply
        </button>
        <button type="button" className="text-blue-600" onClick={() => toggleResolved(c)}>
          {c.resolved ? "Reopen" : "Resolve"}
        </button>
      </div>
      {replyTo === c.id && (
        <div className="mt-2 flex gap-1">
          <input
            className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
            value={replyText}
            maxLength={2000}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply..."
          />
          <button type="button" className="rounded bg-blue-600 px-2 text-xs text-white" onClick={() => reply(c.id)}>
            Send
          </button>
        </div>
      )}
    </li>
  );

  return (
    <aside className="no-print flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-surface p-3" aria-label="Comments">
      <style>{ANCHOR_CSS}</style>
      <h2 className="text-sm font-semibold">Comments</h2>

      <div className="flex flex-col gap-1">
        <textarea
          className="rounded border p-2 text-sm"
          rows={3}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Select text, then add a comment"
        />
        {!canEdit && <p className="text-xs text-gray-500">Highlight not saved for viewers; the quote is kept.</p>}
        <button type="button" className="self-end rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50" disabled={!draft.trim()} onClick={addComment}>
          Add comment
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">{open.map(renderThread)}</ul>
      {open.length === 0 && <p className="text-xs text-gray-500">No open comments.</p>}

      {resolved.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-gray-600">Resolved ({resolved.length})</summary>
          <ul className="mt-2 flex flex-col gap-2 opacity-70">{resolved.map(renderThread)}</ul>
        </details>
      )}
    </aside>
  );
}

function Entry({ c, canDelete, onDelete }: { c: CommentDto; canDelete: boolean; onDelete: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-700">{c.author.name}</span>
        <span>{new Date(c.createdAt).toLocaleString()}</span>
      </div>
      <p className="whitespace-pre-wrap break-words">{c.body}</p>
      {canDelete && (
        <button type="button" className="text-xs text-red-600" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}
