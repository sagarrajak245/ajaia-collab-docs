"use client";
/** Dashboard: lists owned + shared documents; create, delete (owner only), logout. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/utils/api-client";
import type { DocumentDetail, DocumentSummary, UserSummary } from "@/types/domain";
import { ImportButton } from "@/components/upload/ImportButton";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { relativeTime } from "@/components/documents/relativeTime";

interface Listing {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Listing | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, me] = await Promise.all([
        api<Listing>("/api/documents"),
        api<{ user: UserSummary }>("/api/auth/me"),
      ]);
      setDocs(list);
      setUser(me.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDoc() {
    setBusy(true);
    try {
      const doc = await api<DocumentDetail>("/api/documents", { method: "POST", json: {} });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create document");
      setBusy(false);
    }
  }

  async function deleteDoc(d: DocumentSummary) {
    if (!window.confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${d.id}`, { method: "DELETE" });
      setDocs((cur) => (cur ? { ...cur, owned: cur.owned.filter((x) => x.id !== d.id) } : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete document");
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-semibold text-slate-900">Ajaia Docs</span>
          <div className="flex flex-wrap items-center gap-3">
            <ImportButton />
            <button
              type="button"
              onClick={createDoc}
              disabled={busy}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Creating…" : "+ New document"}
            </button>
            {user && <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {error && (
          <div role="alert" className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={load} className="font-medium underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {!docs && !error && <Skeleton />}

        {docs && (
          <>
            <Section title="My documents" empty="You have no documents yet. Create one to get started.">
              {docs.owned.map((d) => (
                <Row key={d.id} doc={d} onDelete={() => deleteDoc(d)} />
              ))}
            </Section>
            <Section title="Shared with me" empty="Nothing has been shared with you yet.">
              {docs.shared.map((d) => (
                <Row key={d.id} doc={d} showOwner />
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-surface px-4 py-8 text-center text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-sm">
          {children}
        </ul>
      )}
    </section>
  );
}

function Row({ doc, showOwner, onDelete }: { doc: DocumentSummary; showOwner?: boolean; onDelete?: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-canvas">
      <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{doc.title || "Untitled"}</p>
        <p className="text-xs text-slate-500">
          {showOwner && <>Shared by {doc.owner.name} · </>}Updated {relativeTime(doc.updatedAt)}
        </p>
      </Link>
      {showOwner && <RoleBadge role={doc.role} />}
      {onDelete && doc.role === "owner" && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${doc.title}`}
          className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      )}
    </li>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading documents" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}
