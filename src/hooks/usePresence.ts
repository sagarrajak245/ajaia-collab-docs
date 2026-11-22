"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
}
export interface Peer extends PresenceUser {
  isEditing: boolean;
  color: string;
}

const COLORS = ["#ef4444", "#f97316", "#d97706", "#16a34a", "#0d9488", "#0284c7", "#4f46e5", "#c026d3", "#e11d48"];

/** Deterministic color from a user id so everyone sees the same color for a person. */
export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

interface TrackedState extends PresenceUser {
  isEditing: boolean;
  at: number;
}

/** Tracks who else is on `doc:<documentId>` via Supabase Realtime Presence (no co-editing). */
export function usePresence(documentId: string, user: PresenceUser | null, isEditing: boolean) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const editingRef = useRef(isEditing);
  editingRef.current = isEditing;

  const userId = user?.id;
  const userName = user?.name;
  const userEmail = user?.email;

  // Join/leave the channel when the document or user changes.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) return;

    const channel = supabase.channel(`doc:${documentId}`, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    const track = () =>
      channel.track({
        id: userId,
        name: userName ?? "",
        email: userEmail ?? "",
        isEditing: editingRef.current,
        at: Date.now(),
      } satisfies TrackedState);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<TrackedState>();
        const byId = new Map<string, Peer>();
        for (const [key, metas] of Object.entries(state)) {
          if (key === userId) continue; // exclude self (all own tabs)
          // Dedupe across tabs: editing in any tab counts as editing.
          const editing = metas.some((m) => m.isEditing);
          const m = metas[metas.length - 1];
          if (!m) continue;
          byId.set(key, { id: key, name: m.name, email: m.email, isEditing: editing, color: colorFor(key) });
        }
        setPeers([...byId.values()]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          void track();
        }
      });

    return () => {
      subscribedRef.current = false;
      channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
      setPeers([]);
    };
  }, [documentId, userId, userName, userEmail]);

  // Re-track (debounced) when editing state flips.
  useEffect(() => {
    const t = setTimeout(() => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current || !userId) return;
      void ch.track({
        id: userId,
        name: userName ?? "",
        email: userEmail ?? "",
        isEditing,
        at: Date.now(),
      } satisfies TrackedState);
    }, 300);
    return () => clearTimeout(t);
  }, [isEditing, userId, userName, userEmail]);

  return { peers };
}
