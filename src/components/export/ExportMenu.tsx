'use client';

import { useEffect, useRef, useState } from 'react';

/** "Export" dropdown: Markdown download (server route) or PDF via browser print. */
export function ExportMenu({ documentId }: { documentId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on Escape or outside click while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const item =
    'block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none';

  return (
    <div ref={rootRef} className="no-print relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
      >
        Export
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-slate-200 bg-surface py-1 shadow-lg"
        >
          {/* Plain anchor: the route replies with Content-Disposition: attachment. */}
          <a
            role="menuitem"
            href={`/api/documents/${encodeURIComponent(documentId)}/export?format=md`}
            download
            onClick={() => setOpen(false)}
            className={item}
          >
            Markdown (.md)
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              // Defer so the menu is gone before the print snapshot.
              setTimeout(() => window.print(), 0);
            }}
            className={item}
          >
            PDF (print)
          </button>
        </div>
      )}
    </div>
  );
}
