"use client";
/**
 * Autosave pipeline shared by title and content edits.
 *
 * Why one pipeline: the server uses an optimistic-lock `version`. If title and
 * content saved independently they would race and cause false 409 conflicts.
 * Here every change is merged into a single pending patch, at most ONE request
 * is in flight, and the version returned by each save feeds the next one.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/utils/api-client";
import type { EditorContent } from "@/types/domain";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";
export interface SavePatch {
  title?: string;
  content?: EditorContent;
}

interface Options {
  initialVersion: number;
  /** Performs the request; must resolve with the server's new version. */
  save: (patch: SavePatch, version: number) => Promise<{ version: number }>;
  debounceMs?: number;
}

export function useAutosave({ initialVersion, save, debounceMs = 1000 }: Options) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const versionRef = useRef(initialVersion);
  const pendingRef = useRef<SavePatch | null>(null);
  const inFlightRef = useRef(false);
  const conflictRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedRef = useRef(false);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /** Sends the pending patch; loops until nothing is left (changes made mid-save). */
  const run = useCallback(async () => {
    if (inFlightRef.current || conflictRef.current) return;
    while (pendingRef.current) {
      const patch = pendingRef.current;
      pendingRef.current = null;
      inFlightRef.current = true;
      setStatus("saving");
      try {
        const res = await saveRef.current(patch, versionRef.current);
        versionRef.current = res.version;
        failedRef.current = false;
      } catch (e) {
        inFlightRef.current = false;
        if (e instanceof ApiClientError && e.status === 409) {
          conflictRef.current = true; // stop: user must reload to get the latest version
          setStatus("conflict");
        } else {
          // Put the patch back (newer edits made meanwhile win) so retry() resends it.
          pendingRef.current = { ...patch, ...(pendingRef.current ?? {}) };
          failedRef.current = true;
          setStatus("error");
        }
        return;
      }
      inFlightRef.current = false;
    }
    setStatus("saved");
  }, []);

  /** Queue a change. Content is debounced; title passes immediate to save at once. */
  const schedule = useCallback(
    (patch: SavePatch, opts?: { immediate?: boolean }) => {
      if (conflictRef.current) return;
      pendingRef.current = { ...pendingRef.current, ...patch };
      clearTimer();
      if (opts?.immediate) void run();
      else timerRef.current = setTimeout(() => void run(), debounceMs);
    },
    [run, debounceMs],
  );

  const flush = useCallback(() => {
    clearTimer();
    void run();
  }, [run]);

  const retry = flush;

  // Flush when the tab is hidden (switching tabs / closing) and on unmount.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [flush]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current || inFlightRef.current || failedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return { status, schedule, flush, retry };
}
