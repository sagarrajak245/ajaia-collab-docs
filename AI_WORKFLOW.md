# AI Workflow Note

📁 **Submission folder (Google Drive):** https://drive.google.com/drive/folders/1uFfBWV8q8dpkNJbHU6JwdIiHPnIpoan6?usp=sharing · 🌐 **Live:** https://ajaia-collab-docs-eight.vercel.app

> **In one line:** I owned the product and architecture decisions and the quality bar. AI was my fast pair-programmer for typing, scaffolding and parallel builds. **Nothing merged until the compiler, the tests and a real run agreed.**

Full decision log with dates and reasons: [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## 1. Tools

| Tool | What I used it for |
|---|---|
| **Claude Code (Claude Opus 5.5)** | Pair-programmer in the terminal: planning discussions, code generation, running tests/builds, git + PRs, Vercel deploy |
| **Parallel specialist agents** | Independent features built at the same time, each confined to its own folders, integrated and verified centrally |
| **Haiku (small model)** | Cheap read-only codebase discovery before handing work to a specialist |
| **My own Claude Code harness** | Guardrails I set up: TDD rules, no direct push to `main`, secrets can't be written or printed, and a verification gate that blocks "done" without a real test/type/build run |

---

## 2. Decisions I made, and why

### 🧭 Architecture & stack

| I decided | Why |
|---|---|
| **Stack rule:** AI/ML workload → Python backend; otherwise **full-stack Next.js (TypeScript)** | This app has no AI workload. One codebase = one deploy, **shared types between client and server**, no CORS, and no free-tier Python cold start (~50 s) in front of a reviewer |
| **Modular monolith**, not microservices | A small app with one team: module boundaries give clean separation **without** network hops, distributed failures or multiple deploys. Modules can be split out later because they already talk through services |
| **Folder layering:** `config/ constants/ exceptions/ types/ validators/ middleware/ services/ repositories/ api/` | Each folder has one job. Dependencies only point down (route → service → repository → DB), so business logic is testable without HTTP and the DB is swappable in tests |
| **Versioned DB migrations** (Drizzle) | Schema changes are reviewable, repeatable and identical in test (PGlite), local and production |
| **Supabase** for Postgres + Storage, `.env.example` committed, real `.env.local` gitignored | Managed Postgres + private object storage in one place; no secret ever enters git |

### 🔌 API contract

| I decided | Why |
|---|---|
| **One request/response structure (DTOs):** success → `{ data }`, failure → `{ error: { code, message, details } }` | The frontend handles every endpoint the same way; stable machine-readable `code`s (`VERSION_CONFLICT`, `FORBIDDEN`…) instead of parsing messages |
| **Interceptor** (`apiHandler`) around every route | Cross-cutting concerns live in **one place**: request id, auth, validation, envelope, error mapping, access log. Each route is 3–5 lines and can't "forget" a step |
| **Middleware** (`src/middleware.ts`) for pages | Redirects logged-out users before any page renders; the API interceptor does the real auth check (defence in depth) |
| **zod validation** on params, query and body | Never trust the client. Bad input gets a clean `400 VALIDATION_ERROR` with field details **before** it reaches business logic, and the same schema generates the TypeScript request type (no drift) |
| **Typed error hierarchy** (`AppError` → `NotFound`, `Forbidden`, `Conflict`…) | Services throw meaning, not HTTP. The interceptor maps it to the right status code |

### 📤 File upload

| I decided | Why |
|---|---|
| **Backend issues a signed upload URL; browser uploads directly to storage** | File bytes **never pass through our serverless function** → faster uploads, no function body-size/time limits, no double bandwidth. The URL is short-lived and only for a **server-chosen path** `{userId}/{uuid}.ext`, so the client never holds storage credentials |
| **Allow-list of types** (`.txt`, `.md`, `.docx`) + **2 MB limit**, checked at sign time **and** re-checked after upload | The client can lie about size; the server measures the real object |
| **Byte-level content sniffing** (magic bytes), not trusting extension or MIME | Extension and `Content-Type` are just client-supplied strings. A `.docx` must start with ZIP magic `PK\x03\x04` **and** contain `word/document.xml`; `.txt/.md` must be valid UTF-8 with no NUL bytes and not secretly a ZIP/PDF/PNG. Renamed executables or binaries are rejected and deleted |

### 👥 Product scope

| I decided | Why |
|---|---|
| **Viewer / Editor roles** + owner | Matches how real sharing works; viewers can still read, export and comment |
| Feature set: tables, text + highlight colour, export (PDF/Markdown), presence, version history, comments | Each one is an independent, cuttable slice on top of a solid core loop |
| **Drop suggestion mode** | (after AI flagged it, see §4) |
| **Login with seeded users only** | The brief allows it; time goes into the document product, not signup flows |

### 🛠️ Engineering process

| I decided | Why |
|---|---|
| **TDD, lean:** per module, unit tests for edge cases + **one integration test** on a real Postgres engine | Highest-risk logic gets a failing test first; no padding with low-value tests |
| **Git flow:** `feature/*` → PR → `develop` → PR → `main`, small conventional commits (3–4+ per module) | Reviewable history; `main` is always deployable |
| **Parallel agents** once the shared foundation was merged | Independent features didn't block each other |

---

## 3. AI proposed → I reviewed and accepted

| AI proposed | Why I accepted it |
|---|---|
| **Optimistic locking** for saves: `UPDATE … WHERE id = $1 AND version = $2` | No Redis or lock server needed. It's a **single atomic SQL statement** (no read-modify-write race); 0 rows updated → `409 VERSION_CONFLICT`, so nobody silently overwrites someone else's work. The same `version` counter drives snapshot history |
| **Real-time presence over WebSocket** (Supabase Realtime Presence, channel `doc:<id>`) | Presence is ephemeral, so it doesn't belong in the DB. A WebSocket channel pushes join/leave/"editing" instantly with no polling and no server of our own |
| **Presence + conflict detection instead of full co-editing (CRDT/Yjs)** | Real co-editing needs a sync server and CRDT state, not achievable safely in the timebox. This is honest about collaboration and never loses data |
| **TipTap**, content stored as **JSON** (not HTML) | Structured, sanitisation-free storage; formatting round-trips exactly; easy to convert to Markdown |
| **Drizzle** over Prisma | Thin, SQL-like, no binary engine, works with the Supabase transaction pooler (`prepare: false`) |
| **PGlite** (in-process Postgres) for integration tests | Runs our **real migrations** in milliseconds, so constraints, cascades and the optimistic-lock `UPDATE` are tested for real, with no Docker |
| **PDF via print stylesheet** | Zero dependencies, real selectable text |
| **Feature priority tiers** | Core loop first, extras as cuttable slices |

---

## 4. AI flagged a risk → I made the call

| AI flagged | My decision |
|---|---|
| Suggestion / track-changes mode is a **paid** TipTap Pro extension; a custom build touches every edit path (2+ h) | **Dropped it.** Comments cover "feedback without editing" |
| A Python backend would cold-start on free hosting | Confirmed **full Next.js** for this task (my stack rule) |
| Switching to Supabase Auth mid-build | **Kept our own auth.** It was already built and tested; switching would cost time for no reviewer-visible gain |
| Supabase exposes every table over a public REST API with the anon key | Added a migration enabling **RLS on every table** with no policies; only our server (direct DB connection) can read data |
| Vercel blocked the deploy: Next.js 15.5.4 had a known CVE | Upgraded to the patched **15.5.29**; re-ran all checks before merging |
| Docker for deployment | **Deferred.** Vercel already gives a live URL; Docker is optional |

---

## 5. Where AI sped things up

| Area | Speed-up |
|---|---|
| **Boilerplate** | Env validation, error hierarchy, interceptor, Drizzle schema + migrations in ~20 min instead of 1 h+. **I defined the structure; AI typed it** |
| **Parallel feature builds** | Dashboard/editor, sharing and import built at once by 3 agents; then export, versions, presence and comments by 4 more |
| **Converters** | Markdown ↔ TipTap JSON, `.docx` → Markdown and the file sniffer, with their test cases |
| **Git at speed** | Dozens of small conventional commits across ~30 PRs, each with a description |

---

## 6. Edge cases the tests pin down

I set the rule that **every module gets edge-case tests plus one integration test**. These are the cases that matter:

| Area | Edge case | Expected |
|---|---|---|
| Access policy | Stranger opens a private doc | **404** (existence not revealed) |
| Access policy | Viewer tries to edit / restore / share | **403** |
| Saves | Two tabs save with the same `version` | Second gets **409**, nothing overwritten |
| Saves | Update with no `version` / content that isn't a TipTap doc / over the size limit | **400** validation error |
| Upload | `.docx` that is just a ZIP without `word/document.xml`, or not a ZIP at all | Rejected by magic bytes; row marked rejected, object deleted |
| Upload | `.txt/.md` that is really a ZIP, PDF, PNG, contains NUL bytes or invalid UTF-8 | Rejected |
| Upload | Empty file / over 2 MB / unsupported extension | **422 / 413 / 415** |
| Upload | Same upload imported twice · someone else's upload | Second import fails · **404** |
| Sharing | Share with yourself · unknown email · same user twice | Rejected · **404** · role updated, no duplicate |
| Sharing | Editor tries to re-share · grant the `owner` role | **403** · rejected (ownership is never shareable) |
| Sharing | Revoke | Former recipient immediately gets **404** |
| Auth | Unknown email vs wrong password | **Same error**, constant-time check (no account enumeration) |
| Auth | Tampered or garbage session token | Rejected |
| Comments | Reply to a reply · resolve a reply | Rejected (one level of threads) |
| Versions | Restore an old version | Snapshots the current state first (non-destructive); history pruned to the newest 50 |

---

## 7. React rules I held generated code to

| Rule | Where it shows up |
|---|---|
| **Every effect cleans up.** React Strict Mode mounts components twice in development, so subscriptions must be idempotent | `usePresence` untracks and removes the Realtime channel in its cleanup, so Strict Mode never leaves a duplicate WebSocket subscription |
| **Complete dependency arrays.** No stale closures | Presence re-subscribes when `documentId`/user change; the "editing" re-track has its own debounced effect |
| **Refs for values that must not re-render** | Autosave keeps pending patch, in-flight flag and version in `useRef`, and reads the latest `save` function through a ref |
| **No hydration mismatch** | TipTap runs with `immediatelyRender: false` because the editor can't render on the server |
| **Never lose work** | Autosave flushes on tab hide and unmount, and warns on `beforeunload` while a save is pending or failed |

---

## 8. AI output I changed or rejected

| What AI generated | Problem | How it was caught | Fix |
|---|---|---|---|
| Routes reading `user.sub` / `user.id` | Our session type is `SessionPayload.userId` | TypeScript strict | Corrected before merge |
| Zod v3 APIs (`.email()`, `.passthrough()`) | Installed version is **Zod v4** | Type errors + discovery pass on real type defs | Moved to v4 APIs (`z.email()`, `z.looseObject`) |
| TipTap `TableKit` import | Doesn't exist in our version | Build error | Used `Table`/`TableRow`/`TableHeader`/`TableCell` |
| `EditorContent` domain type | Not assignable to TipTap's `JSONContent` | TypeScript | Reshaped the type instead of scattering casts |
| Timing-safe login with a hard-coded dummy bcrypt hash | The hash was **invalid**, which broke the timing protection | Test | Real hash computed once, lazily |
| DB schema without row-level security | Supabase REST + public anon key could read **password hashes** | Security review | Migration `0001`: RLS on all tables |
| Install pulled Vitest 5 | Peer conflict with `@types/node` | `npm` ERESOLVE | Pinned compatible versions |
| Version-history code written before its test | Skipped the RED step of TDD | Review of commit order | Kept (tests pass) but **flagged openly** instead of hiding it |

---

## 9. How I verified correctness, UX and reliability

| Check | Evidence |
|---|---|
| **TDD on the riskiest logic** | Access-policy tests **failed first (RED, 11 failures)**, then passed (GREEN). Separate commits in git history |
| **Integration tests on real Postgres** (PGlite + real migrations) | Optimistic-lock conflicts, roles, sharing, import, versions, comments. **80 tests, all green** |
| **Static checks** | `tsc --noEmit` (strict), ESLint and `next build` before every merge |
| **Live API smoke test on production** | Logged-out → 401 · wrong password → generic error · create → save → stale save **409** · stranger **404** · viewer edit/restore **403** · signed upload URL · Markdown export · delete |
| **Manual UX checks in the browser** | Autosave states, view-only mode, toolbar active states, table editing, import limit messages, two browsers side by side for presence |

> **Principle:** AI output is a draft. The compiler, the tests and a real run decide whether it ships.
