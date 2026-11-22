# AI Workflow Note

## Tools used

- **Claude Code (Claude Opus 5.5)** in the terminal as my pair-programmer. It handled planning discussions, code generation, running tests and builds, git/PR operations, and deployment.
- **Parallel AI sub-agents** (Claude Code specialist agents). Once the shared foundation was merged, independent features were built at the same time by separate agents, each confined to its own folders. Later, export, version history, presence and comments were also built in parallel.
- A small, cheap model (**Haiku**) for read-only codebase discovery before handing work to the specialists.
- My own Claude Code **harness** (personal guardrails): TDD rules, git safety (no direct push to `main`, merges through PRs), secret protection (the AI cannot write or print real keys), and a verification gate that blocks "done" claims without a test, type or build run.

## How I split the work between me and the AI

I made the product and architecture decisions; the AI proposed options, flagged risks, and did most of the typing. Every decision, and who proposed it, is recorded in [`DECISIONS.md`](DECISIONS.md).

| I decided | AI proposed and I accepted | AI flagged, I decided |
|---|---|---|
| Stack rule (AI work → Python, otherwise full Next.js); modular-monolith layering; separate config/constants/exceptions/validators/services/repositories | TipTap with JSON storage; Drizzle over Prisma | A Python backend would cold-start on free hosting → I confirmed full Next.js |
| **Signed-URL uploads issued by the backend**, browser uploads directly to storage | Feature priority tiers | Suggestion mode is a **paid** TipTap extension → I dropped it |
| **Byte-level content-type sniffing** + file-type and size limits | Presence + optimistic locking instead of CRDT co-editing | Whether to switch to Supabase Auth mid-build → I kept our own auth (already built and tested) |
| Viewer/editor roles; feature set (tables, colors, export, versions, presence, comments) | PDF via print stylesheet | Docker: deferred as optional, after the live deploy |
| zod validation, request/response envelope, interceptor-style API wrapper | PGlite for integration tests | |
| Git flow (feature → develop → main via PRs, small commits), lean TDD testing strategy | | |

## Where AI materially sped things up

- **Scaffolding and boilerplate:** env validation, the error hierarchy, the API wrapper, Drizzle schema and migrations. About 20 minutes instead of over an hour.
- **Parallel feature builds:** dashboard/editor UI, sharing and file import were written at the same time by three agents, then export, versions, presence and comments by four more. The work was integrated and verified centrally.
- **Converters and edge-case tests:** Markdown ↔ TipTap JSON and the file sniffer are tedious to get right; the AI produced them with their test cases.
- **Git discipline at speed:** about 50 small conventional commits across 20+ PRs, each with a description.

## What AI-generated output I changed or rejected

- **Wrong session field in generated routes:** several agents used `user.sub` / `user.id` instead of our `SessionPayload.userId`. Caught by the TypeScript compiler and corrected before merge.
- **Library API drift:** generated code used Zod v3 APIs (`.email()`, `.passthrough()`) against the installed Zod v4, and assumed a TipTap `TableKit` export that doesn't exist in our version. I had a discovery pass read the real type definitions, then fixed the code.
- **A type that didn't fit the editor:** the first `EditorContent` type wasn't assignable to TipTap's `JSONContent`. I reshaped the domain type instead of scattering casts.
- **A subtle security bug:** the first timing-safe login used a hard-coded "dummy" bcrypt hash that wasn't a valid hash. I replaced it with a real hash computed once at startup.
- **A security gap the generated design missed:** Supabase exposes every table over REST to the public anon key. I added a migration enabling **RLS on all tables**; otherwise password hashes would have been readable.
- **Dependency conflicts:** a generated install pulled Vitest 5, which conflicted with `@types/node`; I pinned compatible versions. Vercel blocked the first deploy because Next.js 15.5.4 had a known vulnerability; I upgraded to the patched 15.5.x release.
- **Process deviation:** one agent wrote the version-history code before its test (no RED step). I accepted the passing tests but flagged the deviation instead of hiding it.

## How I verified correctness, UX and reliability

- **TDD on the riskiest logic:** the access-policy tests were run and **failed first (RED, 11 failures)**, then passed after implementation (GREEN). The git history shows the RED and GREEN commits separately.
- **Integration tests on a real Postgres engine** (PGlite + our real migrations): optimistic-lock conflicts, role enforcement (viewer cannot edit, strangers get 404), sharing, import, versions and comments. **80 tests, all passing.**
- **Static checks:** `tsc --noEmit` in strict mode, ESLint, and `next build` before every merge.
- **Live end-to-end checks against the real Supabase database:** unauthenticated → 401; wrong password → generic error; create → save → stale save gets 409; an unshared user gets 404; share as viewer → viewer can read and comment, editing or restoring gets 403; signed upload URL issued; Markdown export headers and body correct; delete.
- **UX checks by hand in the browser:** autosave status states, view-only mode, toolbar active states, table editing, the import dialog's limit messages, and two browsers side by side for presence.

**Principle:** the AI's output was treated as a draft. Nothing merged without the compiler, the tests, and a real run agreeing.
