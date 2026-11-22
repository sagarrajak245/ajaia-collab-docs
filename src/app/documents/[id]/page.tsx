"use client";
/** Document editor page: title, autosaving rich-text body, role-aware UI. */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/utils/api-client";
import type { DocumentDetail, EditorContent } from "@/types/domain";
import { useAutosave, type SavePatch } from "@/hooks/useAutosave";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { SaveStatus } from "@/components/editor/SaveStatus";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { ShareButton } from "@/components/sharing/ShareButton";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DocumentDetail>(`/api/documents/${id}`)
      .then((d) => !cancelled && setDoc(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error)
    return (
      <Centered>
        <p className="text-red-700">{error}</p>
        <Link href="/documents" className="text-blue-600 underline">Back to documents</Link>
      </Centered>
    );
  if (!doc)
    return (
      <Centered>
        <p aria-busy="true" className="animate-pulse text-slate-500">Loading document…</p>
      </Centered>
    );
  // Mounted only once loaded so the autosave hook starts with the real version.
  return <Editor doc={doc} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">{children}</div>;
}

function Editor({ doc }: { doc: DocumentDetail }) {
  const canEdit = doc.role !== "viewer";
  const [title, setTitle] = useState(doc.title);
  const [savedTitle, setSavedTitle] = useState(doc.title);

  // Title and content share this one pipeline (and so one version counter).
  const save = useCallback(
    (patch: SavePatch, version: number) =>
      api<DocumentDetail>(`/api/documents/${doc.id}`, { method: "PATCH", json: { ...patch, version } }),
    [doc.id],
  );
  const { status, schedule, retry } = useAutosave({ initialVersion: doc.version, save });

  function commitTitle() {
    const next = title.trim();
    if (!next) return setTitle(savedTitle); // titles can't be blank: revert
    setTitle(next);
    if (next === savedTitle) return;
    setSavedTitle(next);
    schedule({ title: next }, { immediate: true });
  }

  const onContentChange = useCallback((content: EditorContent) => schedule({ content }), [schedule]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="no-print flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/documents" className="text-sm text-slate-600 hover:text-slate-900">← Documents</Link>
        <input
          aria-label="Document title"
          value={title}
          disabled={!canEdit}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-lg font-medium text-slate-900 hover:border-slate-200 focus:border-blue-500 focus:outline-none disabled:bg-transparent"
        />
        <SaveStatus status={status} onRetry={retry} />
        <RoleBadge role={doc.role} />
        <div className="flex items-center gap-2">
          <ShareButton documentId={doc.id} isOwner={doc.role === "owner"} />
          {/* extension slot: export / version history / presence / comments buttons go here */}
        </div>
      </header>

      {!canEdit && (
        <div role="note" className="no-print bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          View only: you don&apos;t have permission to edit this document.
        </div>
      )}

      <RichTextEditor initialContent={doc.content} editable={canEdit} onChange={onContentChange} />
    </div>
  );
}
