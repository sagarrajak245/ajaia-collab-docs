"use client";

/**
 * Share button + modal. Everyone with access can see who the document is
 * shared with; only the owner can add, change or remove people.
 * Server-side checks are the real enforcement: `isOwner` just hides controls.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/utils/api-client";
import type { DocumentDetail, DocumentShareDto, UserSummary } from "@/types/domain";

type Role = "viewer" | "editor";

const errMsg = (e: unknown) => (e instanceof ApiClientError ? e.message : "Something went wrong");

export function ShareButton({ documentId, isOwner }: { documentId: string; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState<UserSummary | null>(null);
  const [shares, setShares] = useState<DocumentShareDto[]>([]);
  const [directory, setDirectory] = useState<UserSummary[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [doc, list] = await Promise.all([
        api<DocumentDetail>(`/api/documents/${documentId}`),
        api<DocumentShareDto[]>(`/api/documents/${documentId}/shares`),
      ]);
      setOwner(doc.owner);
      setShares(list);
      // The user directory only feeds the owner's email suggestions.
      if (isOwner) setDirectory(await api<UserSummary[]>("/api/users"));
    } catch (e) {
      setError(errMsg(e));
    }
  }, [documentId, isOwner]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Esc closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Runs a mutation, then refreshes; surfaces server messages inline. */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      api(`/api/documents/${documentId}/shares`, { method: "POST", json: { email: email.trim(), role } }),
    );
    if (ok) setEmail("");
  }

  const changeRole = (s: DocumentShareDto, next: Role) =>
    run(() => api(`/api/documents/${documentId}/shares/${s.id}`, { method: "PATCH", json: { role: next } }));
  const remove = (s: DocumentShareDto) =>
    run(() => api(`/api/documents/${documentId}/shares/${s.id}`, { method: "DELETE" }));

  const selectCls = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="share-title" className="text-lg font-semibold text-slate-900">
                Share document
              </h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>

            {isOwner && (
              <form onSubmit={add} className="mb-4 flex gap-2">
                <input
                  type="email"
                  required
                  list="share-user-directory"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Add person by email"
                  aria-label="Email of person to share with"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <datalist id="share-user-directory">
                  {directory.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name}
                    </option>
                  ))}
                </datalist>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role" className={selectCls}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <ul className="divide-y divide-slate-200">
              {owner && (
                <li className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">{owner.name}</span>{" "}
                    <span className="text-slate-500">{owner.email}</span>
                  </span>
                  <span className="text-slate-500">Owner</span>
                </li>
              )}
              {shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-slate-900">{s.user.name}</span>{" "}
                    <span className="text-slate-500">{s.user.email}</span>
                  </span>
                  {isOwner ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <select
                        value={s.role}
                        disabled={busy}
                        onChange={(e) => void changeRole(s, e.target.value as Role)}
                        aria-label={`Role for ${s.user.email}`}
                        className={selectCls}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(s)}
                        aria-label={`Remove ${s.user.email}`}
                        className="text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <span className="text-slate-500 capitalize">{s.role}</span>
                  )}
                </li>
              ))}
            </ul>
            {shares.length === 0 && <p className="py-2 text-sm text-slate-500">Not shared with anyone yet.</p>}
          </div>
        </div>
      )}
    </>
  );
}
