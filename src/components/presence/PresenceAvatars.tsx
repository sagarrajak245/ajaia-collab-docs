"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api-client";
import { usePresence, type PresenceUser } from "@/hooks/usePresence";

const MAX_SHOWN = 4;

function initials(name: string, email: string): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return s.toUpperCase();
}

/** Overlapping avatars of other people currently viewing/editing this document. */
export function PresenceAvatars({ documentId, isEditing }: { documentId: string; isEditing: boolean }) {
  const [me, setMe] = useState<PresenceUser | null>(null);

  // Fetch the current user once.
  useEffect(() => {
    let cancelled = false;
    api<{ user: PresenceUser }>("/api/auth/me")
      .then((r) => {
        if (!cancelled) setMe(r.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { peers } = usePresence(documentId, me, isEditing);
  if (peers.length === 0) return null; // "Only you" state: render nothing

  const shown = peers.slice(0, MAX_SHOWN);
  const extra = peers.length - shown.length;
  const label =
    "Also here: " + peers.map((p) => `${p.name || p.email} (${p.isEditing ? "editing" : "viewing"})`).join(", ");

  return (
    <div className="no-print flex items-center" role="group" aria-label={label}>
      {shown.map((p, i) => (
        <span
          key={p.id}
          title={`${p.name || p.email} — ${p.isEditing ? "editing…" : "viewing"}`}
          className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ${i > 0 ? "-ml-2" : ""}`}
          style={{ backgroundColor: p.color }}
        >
          {initials(p.name, p.email)}
          {p.isEditing && (
            <span className="absolute -right-0.5 -bottom-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white bg-green-500" />
            </span>
          )}
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-semibold text-gray-700">
          +{extra}
        </span>
      )}
    </div>
  );
}
