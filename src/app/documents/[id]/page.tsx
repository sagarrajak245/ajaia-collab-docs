"use client";
/**
 * Document editor page: title, autosaving rich-text body, role-aware UI, plus
 * collaboration features (sharing, presence, comments, version history, export).
 */
import type { Editor as TiptapEditor } from "@tiptap/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/utils/api-client";
import type { DocumentDetail, EditorContent, UserSummary } from "@/types/domain";
import { useAutosave, type SavePatch } from "@/hooks/useAutosave";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { SaveStatus } from "@/components/editor/SaveStatus";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { ShareButton } from "@/components/sharing/ShareButton";
import { ExportMenu } from "@/components/export/ExportMenu";
import { VersionHistoryButton } from "@/components/versions/VersionHistoryButton";
import { PresenceAvatars } from "@/components/presence/PresenceAvatars";
import { CommentsPanel } from "@/components/comments/CommentsPanel";

/** How long after the last keystroke a user still counts as "editing" for presence. */
const EDITING_IDLE_MS = 2500;

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped on version restore to remount the editor with fresh content + version.
  const [mountKey, setMountKey] = useState(0);

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
  return (
    <Editor
      key={mountKey}
      doc={doc}
      onRestored={(restored) => {
        setDoc(restored);
        setMountKey((k) => k + 1);
      }}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas">{children}</div>;
}

function Editor({ doc, onRestored }: { doc: DocumentDetail; onRestored: (doc: DocumentDetail) => void }) {
  const canEdit = doc.role !== "viewer";
  const [title, setTitle] = useState(doc.title);
  const [savedTitle, setSavedTitle] = useState(doc.title);
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [me, setMe] = useState<UserSummary | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<{ user: UserSummary }>("/api/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => setMe(null));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Title and content share this one pipeline (and so one version counter).
  const save = useCallback(
    (patch: SavePatch, version: number) =>
      api<DocumentDetail>(`/api/documents/${doc.id}`, { method: "PATCH", json: { ...patch, version } }),
    [doc.id],
  );
  const { status, schedule, retry, getVersion } = useAutosave({ initialVersion: doc.version, save });

  function commitTitle() {
    const next = title.trim();
    if (!next) return setTitle(savedTitle); // titles can't be blank: revert
    setTitle(next);
    if (next === savedTitle) return;
    setSavedTitle(next);
    schedule({ title: next }, { immediate: true });
  }

  const onContentChange = useCallback(
    (content: EditorContent) => {
      schedule({ content });
      // Presence: mark as "editing" while typing, back to "viewing" after a short idle.
      setIsEditing(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIsEditing(false), EDITING_IDLE_MS);
    },
    [schedule],
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-surface px-4 py-2">
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
        <PresenceAvatars documentId={doc.id} isEditing={isEditing} />
        <RoleBadge role={doc.role} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-pressed={showComments}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              showComments ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:bg-canvas"
            }`}
          >
            Comments
          </button>
          <VersionHistoryButton
            documentId={doc.id}
            canRestore={canEdit}
            currentVersion={getVersion}
            onRestored={onRestored}
          />
          <ExportMenu documentId={doc.id} title={title} />
          <ShareButton documentId={doc.id} isOwner={doc.role === "owner"} />
        </div>
      </header>

      {!canEdit && (
        <div role="note" className="no-print bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          View only: you can read and comment, but not edit this document.
        </div>
      )}

      <div className="flex flex-1">
        <div className="min-w-0 flex-1">
          <RichTextEditor
            initialContent={doc.content}
            editable={canEdit}
            onChange={onContentChange}
            onReady={setEditor}
          />
        </div>
        {showComments && (
          <CommentsPanel
            documentId={doc.id}
            editor={editor}
            canEdit={canEdit}
            currentUserId={me?.id ?? null}
            isOwner={doc.role === "owner"}
          />
        )}
      </div>
    </div>
  );
}
