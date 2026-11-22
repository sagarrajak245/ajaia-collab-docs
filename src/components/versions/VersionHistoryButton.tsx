"use client";
/**
 * Version history: a "History" button that opens a right-hand slide-over with
 * the saved versions, a read-only preview and a confirmed, non-destructive
 * restore (the server snapshots the current state first, so restore is undoable).
 */
import { generateHTML } from "@tiptap/html";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getEditorExtensions } from "@/components/editor/extensions";
import type { DocumentDetail, DocumentVersionDto, EditorContent } from "@/types/domain";
import { api, ApiClientError } from "@/utils/api-client";

interface Props {
  documentId: string;
  /** Owner/editor: may save and restore versions. */
  canRestore: boolean;
  /** Returns the document version the editor currently holds (optimistic lock). */
  currentVersion: () => number;
  onRestored: (doc: DocumentDetail) => void;
}

type VersionDetail = DocumentVersionDto & { content: EditorContent };

function relativeTime(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

const errorMessage = (e: unknown) => (e instanceof ApiClientError || e instanceof Error ? e.message : "Something went wrong");

export function VersionHistoryButton({ documentId, canRestore, currentVersion, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersionDto[]>([]);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/documents/${documentId}/versions`;

  const load = useCallback(async () => {
    try {
      setVersions(await api<DocumentVersionDto[]>(base));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [base]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const saveVersion = () =>
    run(async () => {
      await api(base, { method: "POST" });
      await load();
    });

  const preview = (id: string) =>
    run(async () => {
      setConfirming(false);
      setSelected(await api<VersionDetail>(`${base}/${id}`));
    });

  const restore = () =>
    selected &&
    run(async () => {
      const doc = await api<DocumentDetail>(`${base}/${selected.id}/restore`, {
        method: "POST",
        body: JSON.stringify({ version: currentVersion() }),
      });
      onRestored(doc);
      setSelected(null);
      setConfirming(false);
      setOpen(false);
    });

  // Read-only HTML render of the selected version using the editor's own extensions.
  const previewHtml = useMemo(() => {
    if (!selected) return "";
    try {
      return generateHTML(selected.content, getEditorExtensions());
    } catch {
      return "<p>Preview unavailable for this version.</p>";
    }
  }, [selected]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
      >
        History
      </button>

      {open && (
        <div className="no-print fixed inset-0 z-40 flex justify-end" role="presentation">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Version history"
            className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Version history</h2>
              <button
                type="button"
                aria-label="Close version history"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </header>

            {error && (
              <p role="alert" className="mx-4 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {canRestore && (
              <div className="px-4 pt-3">
                <button
                  type="button"
                  onClick={saveVersion}
                  disabled={busy}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save version
                </button>
              </div>
            )}

            <ul className="max-h-56 overflow-y-auto px-2 py-3" aria-label="Saved versions">
              {versions.length === 0 && <li className="px-2 text-sm text-slate-500">No versions yet.</li>}
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => preview(v.id)}
                    aria-current={selected?.id === v.id}
                    className={`w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100 ${
                      selected?.id === v.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="block font-medium text-slate-800">{relativeTime(v.createdAt)}</span>
                    <span className="block text-xs text-slate-500">{v.createdBy.name}</span>
                  </button>
                </li>
              ))}
            </ul>

            {selected && (
              <section className="flex min-h-0 flex-1 flex-col border-t border-slate-200" aria-label="Version preview">
                <div
                  className="prose prose-sm min-h-0 flex-1 overflow-y-auto px-4 py-3"
                  // Rendered from our own schema via TipTap's generateHTML (escapes text content).
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                {canRestore && (
                  <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
                    {confirming ? (
                      <>
                        <span className="text-sm text-slate-700">Replace the current text? You can undo by restoring again.</span>
                        <button
                          type="button"
                          onClick={restore}
                          disabled={busy}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(false)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Restore this version
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
