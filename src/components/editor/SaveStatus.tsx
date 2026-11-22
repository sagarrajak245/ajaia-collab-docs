import type { SaveStatus as Status } from "@/hooks/useAutosave";

/** Small pill showing autosave state; Failed/Conflict carry an action button. */
export function SaveStatus({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";
  if (status === "saving") return <span role="status" className={`${base} bg-slate-100 text-slate-600`}>Saving…</span>;
  if (status === "saved") return <span role="status" className={`${base} bg-green-50 text-green-700`}>Saved</span>;
  if (status === "error")
    return (
      <span role="status" className={`${base} bg-red-50 text-red-700`}>
        Failed to save
        <button type="button" onClick={onRetry} className="underline hover:no-underline">Retry</button>
      </span>
    );
  if (status === "conflict")
    return (
      <span role="status" className={`${base} bg-amber-50 text-amber-800`}>
        Edited elsewhere
        <button type="button" onClick={() => window.location.reload()} className="underline hover:no-underline">
          Reload
        </button>
      </span>
    );
  return null;
}
