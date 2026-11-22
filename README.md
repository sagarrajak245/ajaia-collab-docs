# Ajaia Docs: Lightweight Collaborative Document Editor

A focused, Google-Docs-inspired editor: create and format documents, import files, share them with viewer/editor roles, and collaborate with presence, comments, version history and export.

**Live app:** https://ajaia-collab-docs-eight.vercel.app
**Repository:** https://github.com/sagarrajak245/ajaia-collab-docs

## Demo accounts

All accounts use the password **`password123`**. The login page also has one-click buttons for each account.

| User | Email | Seeded data |
|---|---|---|
| Alice | `alice@ajaia.test` | Owns *Welcome to Ajaia Docs*, shared with Bob as **editor** |
| Bob | `bob@ajaia.test` | Sees the welcome doc under **Shared with me** |
| Carol | `carol@ajaia.test` | No documents. Use her to test sharing as a **viewer** |

**Suggested review flow:** log in as Alice → create a document and format it (headings, lists, colors, table) → *Share* it with `carol@ajaia.test` as **Viewer** → open the same document as Carol in a private window. You'll see the view-only banner, live presence avatars, and that she can comment but not edit.

## Features

| Area | What works |
|---|---|
| Documents | Create, rename inline, delete (owner), autosave (1 s debounce) with a save-status indicator, reopen with formatting preserved |
| Formatting | Bold, italic, underline, H1–H3, bulleted/numbered lists, **text color**, **highlight color**, **tables** (insert, add/remove rows and columns), undo/redo |
| File import | **`.txt`, `.md`, `.docx` up to 2 MB** become a new editable document. Uses backend-issued signed upload URLs and server-side content sniffing |
| Sharing | Owner shares by email as **Viewer** (read + comment) or **Editor** (edit). Change role or revoke. Dashboard splits *My documents* / *Shared with me* |
| Concurrency | Optimistic locking: a stale save returns `409`, and the UI shows *Conflict: Reload*. Edits are never silently overwritten |
| Presence | Live avatars of who is viewing or editing (Supabase Realtime) |
| Comments | Comments anchored to selected text, replies, resolve/reopen |
| Version history | Automatic snapshots (max 1 per 5 min) plus manual *Save version*, preview, **non-destructive restore** |
| Export | Markdown download; PDF via a print stylesheet (selectable text) |

**Supported upload types:** `.txt`, `.md`, `.docx`, maximum 2 MB. Other types are rejected, and the limits are shown in the import dialog.

## Tech stack

Next.js 15 (App Router, TypeScript strict) · Tailwind CSS · TipTap v3 · Drizzle ORM · Supabase (Postgres, Storage, Realtime) · zod · jose · bcryptjs · Vitest + PGlite · Vercel

Architecture, priorities and trade-offs: [`ARCHITECTURE.md`](ARCHITECTURE.md). How AI was used: [`AI_WORKFLOW.md`](AI_WORKFLOW.md).

## Run locally

**Prerequisites:** Node.js 20+ and a free Supabase project.

```bash
git clone https://github.com/sagarrajak245/ajaia-collab-docs.git
cd ajaia-collab-docs
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run db:migrate              # creates tables + enables RLS
npm run db:seed                 # demo users + welcome document
npm run dev                     # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port 6543), `postgresql://…` |
| `SESSION_SECRET` | Any random string of 32+ characters (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` key (public; only used for Realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key (**server only**) |
| `SUPABASE_STORAGE_BUCKET` | Name of a **private** Storage bucket (default `document-uploads`) |

### Storage bucket setup

Create a private bucket named `document-uploads`, then run this in the Supabase SQL editor:

```sql
update storage.buckets
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['text/plain','text/markdown','text/x-markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/octet-stream']
where id = 'document-uploads';
```

No storage policies are needed. Uploads are authorized by short-lived signed tokens issued by the server.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop / build / serve |
| `npm test` | All tests (unit + integration) |
| `npm run test:unit` / `test:integration` | One layer only |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint |
| `npm run db:generate` / `db:migrate` / `db:seed` | Versioned migrations / apply / seed |

## Tests

```bash
npm test     # 80 tests in 14 files, ~10 s, no external services needed
```

- **Unit tests:** access-policy permission matrix, request validators, upload content sniffing (magic bytes, UTF-8, NUL, size), Markdown/TipTap converters, session tokens.
- **Integration tests:** each service runs against **PGlite** (in-memory Postgres) with the project's real migrations. Covered: documents (optimistic locking, roles), sharing, upload import (with fake storage), versions, comments, and auth.

## Project structure

```
src/
├── app/                 # pages + thin API route handlers
├── server/              # backend modular monolith
│   ├── config/          # zod-validated env
│   ├── constants/       # roles, limits, error codes, upload rules
│   ├── exceptions/      # AppError hierarchy + error→HTTP mapper
│   ├── middleware/      # apiHandler "interceptor" (auth, validation, logging, errors)
│   ├── db/              # Drizzle schema, migrations, seed
│   ├── repositories/    # data access
│   ├── services/        # business logic + access policy
│   ├── validators/      # zod request schemas
│   └── lib/             # session, storage, file sniffer, converters, logger
├── components/ hooks/ lib/ types/ utils/
tests/{unit,integration,helpers}
```

## Deployment

The app is deployed on **Vercel** (free tier) with **Supabase** (free tier), so reviewers don't need to pay for anything. Merges to `main` deploy automatically. Set the same env vars in Vercel → Project → Settings → Environment Variables.
