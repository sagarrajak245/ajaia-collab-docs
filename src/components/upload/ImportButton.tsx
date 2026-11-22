"use client";

/**
 * "Import" button + modal.
 * Flow: pre-check file -> POST /api/uploads/sign -> upload straight to Supabase
 * Storage with the signed token -> POST /api/documents/import -> open the document.
 * The client checks are only for fast feedback; the server re-validates everything.
 */
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import {
  SUPPORTED_UPLOAD_EXTENSIONS,
  UPLOAD_HUMAN_LIMITS,
  UPLOAD_MAX_BYTES,
} from "@/server/constants/upload";

type Phase = "idle" | "uploading" | "converting";

async function api<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? "Something went wrong");
  return json.data as T;
}

export function ImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = phase !== "idle";

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  async function handleFile(file: File) {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(SUPPORTED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
      return setError(`Unsupported file type. ${UPLOAD_HUMAN_LIMITS}`);
    }
    if (file.size === 0) return setError("That file is empty.");
    if (file.size > UPLOAD_MAX_BYTES) return setError(`File is too large. ${UPLOAD_HUMAN_LIMITS}`);

    try {
      setPhase("uploading");
      const signed = await api<{ uploadId: string; path: string; token: string; bucket: string }>(
        "/api/uploads/sign",
        { fileName: file.name, size: file.size, mimeType: file.type },
      );
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { error: upErr } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || undefined });
      if (upErr) throw new Error("Upload failed. Please try again.");

      setPhase("converting");
      const doc = await api<{ id: string }>("/api/documents/import", { uploadId: signed.uploadId });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setPhase("idle");
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !busy) void handleFile(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Import
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="import-title" className="text-lg font-semibold text-slate-900">
              Import a document
            </h2>
            <p className="mt-1 text-sm text-slate-600">{UPLOAD_HUMAN_LIMITS}</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`mt-4 flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-center text-sm ${
                dragging ? "border-blue-600 bg-blue-50" : "border-slate-300"
              }`}
            >
              {busy ? (
                <p role="status" className="font-medium text-slate-700">
                  {phase === "uploading" ? "Uploading…" : "Converting…"}
                </p>
              ) : (
                <>
                  <p className="text-slate-600">Drag a file here, or</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-md bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Choose file
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                hidden
                aria-label="Choose a file to import"
                accept={SUPPORTED_UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(",")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ""; // allow re-picking the same file after an error
                  if (file) void handleFile(file);
                }}
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
