# Architecture Note

## 1. What I prioritized, and why

The brief rewards **depth in a few areas over shallow coverage**, so I made the core loop solid first and built every extra as an independent, shippable slice.

1. **The core document loop has to be trustworthy.** Create → edit → autosave → reopen, with formatting stored as **structured TipTap JSON** (not HTML). Saves use **optimistic locking**: a stale write gets `409` instead of silently overwriting someone else's work.
2. **Upload and sharing use production patterns, not shortcuts.** Files go through **backend-issued signed URLs straight to private storage**, and the server verifies **the real file type from its bytes**. All permissions come from **one access-policy module** enforced on the server.
3. **Collaboration extras** (presence, comments, versions, export), each built so it could be cut at the deadline without breaking anything else.

## 2. System overview

```
Browser (Next.js client)
  │  fetch /api/* (httpOnly session cookie)      │ upload bytes (signed URL)   │ presence (WebSocket)
  ▼                                              ▼                             ▼
Next.js on Vercel ── route handlers ──►  Supabase Storage (private)    Supabase Realtime
  apiHandler (interceptor)                       ▲ download + sniff
  → validators (zod) → services → repositories ──┘
                                     │ Drizzle (transaction pooler :6543)
                                     ▼
                              Supabase Postgres (RLS on, no public access)
```

**Why a single Next.js app (not FastAPI + Next.js):** this is not an AI workload. One TypeScript codebase gives one deployment, **shared types between client and server**, no CORS, and no free-tier backend cold start (a Python service on a free tier can sleep for ~50 s, which is a bad first impression for a reviewer). The backend still follows my **modular-monolith layering**.

## 3. Backend layering

| Layer | Responsibility | Rule |
|---|---|---|
| `app/api/**/route.ts` | HTTP entry | A few lines: wrap with `apiHandler`, call a service |
| `server/middleware/api-handler.ts` | **Interceptor** | Session auth → zod validation (params/query/body) → handler → `{data}` envelope; catches every error → `{error:{code,message}}`; request id + access log |
| `server/validators` | Validation rules | zod schemas; also the source of request TS types |
| `server/services` | Business logic | Throws typed `AppError`s; every action goes through `authorize()` → `access-policy` |
| `server/repositories` | Data access only | Receive `Db` via constructor (DI), so tests inject PGlite |
| `server/container.ts` | Composition root | The only place classes are wired to the real database |

Dependencies only point downward (route → service → repository → db). Services know nothing about HTTP.

## 4. Data model

`users` · `documents` (owner, title, **content jsonb**, **version** for optimistic locking, `last_snapshot_at`) · `document_shares` (unique per document+user, role `viewer|editor`) · `document_versions` · `comments` (anchor id, quote, thread parent, resolved) · `uploads` (pending → imported/rejected).
The schema changes **only through versioned Drizzle migrations**. Migration `0001` enables **RLS on every table with no policies**: Supabase's auto-generated REST API is otherwise readable with the *public* anon key, which would expose password hashes and documents.

## 5. Key flows

**Save with optimistic locking.** The client sends `{content, version}`. The server runs `UPDATE … SET version = version + 1 WHERE id = $1 AND version = $2`. If 0 rows change, it returns `409 VERSION_CONFLICT`. It is atomic, with no read-modify-write race. The autosave hook debounces (1 s), keeps one request in flight, and shares one version counter between title and content saves.

**File import.** (1) `POST /uploads/sign` validates extension, declared MIME type and size, and returns a **short-lived signed upload URL** for a **server-chosen path** `{userId}/{uuid}.{ext}`. (2) The browser uploads directly to the private bucket, so no bytes pass through serverless functions and the client never holds storage credentials. (3) `POST /documents/import` claims the upload row atomically (no double import), downloads the file, re-checks the real size, **sniffs the content** (docx = ZIP magic `PK\x03\x04` + `word/document.xml`; txt/md = valid UTF-8, no NUL bytes, not ZIP/PDF/PNG), converts it, and creates the document. Rejected files are marked and deleted. Every format goes through one conversion path: **txt/md/docx → Markdown → TipTap JSON**.

**Authorization.** `resolveRole` → `assertCan(role, action)`. No access returns **404** (so a private document's existence is never revealed). Access without the needed permission returns **403**. The permission matrix is unit-tested.

**Auth.** Seeded users, bcrypt hashes, HS256 JWT in an **httpOnly, SameSite=Lax, Secure** cookie. Login takes the same time for an unknown email as for a wrong password, so timing can't be used to find which accounts exist. Page middleware redirects to `/login?next=`, and `next` only accepts same-site paths (no open redirect).

## 6. Trade-offs and what I deliberately deprioritized

| Decision | Trade-off |
|---|---|
| **Presence + optimistic locking instead of real-time co-editing (CRDT/Yjs)** | Real co-editing needs a sync server and CRDT state, which wasn't achievable well in the timebox. This choice is honest about collaboration and never loses data. |
| **Seeded users instead of Supabase Auth / signup** | The brief allows it; auth isn't what's being evaluated. I built my own session handling (cookie flags, timing-safe login) instead of wiring in a product. |
| **Suggestion mode dropped** | TipTap's track-changes is a paid Pro extension (the brief forbids paid dependencies); a custom build is 2+ h across every edit path. Comments cover the "feedback without editing" need. |
| **PDF via print stylesheet** | Zero dependencies, real selectable text. Downside: it uses the browser print dialog instead of a direct download. |
| **Markdown export is lossy for colors/underline** | Markdown has no syntax for them; this is documented. |
| **Viewer comments have no inline highlight** | The anchor lives in the document JSON, and viewers can't modify the document. Their comments store the quoted text instead. |
| **Presence channel uses the public anon key** | It only reveals who is looking at a document id you already know. Tables are protected by RLS. |

## 7. Testing approach

TDD where bugs would hurt most (access policy, upload sniffing, validators, converters): failing test first, then the code. Each module has unit tests for its edge cases, plus **one integration test against PGlite running the real migrations**, so SQL, constraints, cascades and the optimistic-lock `UPDATE` are exercised for real. No UI snapshot or browser E2E tests in this timebox; the main flow was verified manually and through live API smoke checks against the deployed database.

## 8. Next 2–4 hours

1. Real-time co-editing with Yjs + a TipTap collaboration provider (replacing optimistic locking for live sessions).
2. Playwright E2E for the main flow (login → create → share → viewer sees it).
3. Persist viewer comment anchors with relative positions stored server-side.
4. Rate limiting on login and upload signing; audit log of share changes.
5. Direct PDF download (server-side rendering) and `.docx` export.
