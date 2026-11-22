# Submission: Ajaia AI-Native Assessment

**Candidate:** Sagar Rajak
**Live product:** https://ajaia-collab-docs-eight.vercel.app
**Source:** https://github.com/sagarrajak245/ajaia-collab-docs
**Walkthrough video:** see `VIDEO_URL.txt`

## Test accounts (password for all: `password123`)

| Email | Role in the seeded data |
|---|---|
| `alice@ajaia.test` | Owner of *Welcome to Ajaia Docs* |
| `bob@ajaia.test` | Has the welcome doc shared with him as **Editor** |
| `carol@ajaia.test` | No documents; share something with her as **Viewer** |

The login page has one-click buttons for each account. To test sharing, use a second browser or a private window.

## What's included

| Item | Location |
|---|---|
| Source code | This folder (`src/`, `tests/`, config files) |
| Setup and run instructions | `README.md` |
| Architecture note (priorities, design, trade-offs) | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Requirements (functional and non-functional) | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) |
| Decision log (who decided what, and why) | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| Build plan | [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Environment template | `.env.example` |
| Database migrations and seed | `src/server/db/migrations/`, `src/server/db/seed.ts` |
| Automated tests (80) | `tests/unit/`, `tests/integration/` |

## Status

### Working end to end
- Login with seeded users; protected pages and APIs
- Create, rename, edit, autosave, reopen, delete; formatting preserved as structured JSON
- Bold, italic, underline, H1–H3, bulleted/numbered lists, text color, highlight color, tables, undo/redo
- Import `.txt` / `.md` / `.docx` (≤ 2 MB) into a new document: signed-URL upload plus server-side content sniffing
- Sharing by email with Viewer/Editor roles; change role or revoke; *My documents* vs *Shared with me*
- Conflict-safe saves (409 on stale version)
- Presence avatars (viewing / editing), anchored comments with replies and resolve, version history with non-destructive restore, Markdown export, PDF via print

### Partial or limited (deliberate)
- **Collaboration is presence + conflict detection, not simultaneous co-editing.** Two editors typing at once get a "Conflict – Reload" prompt rather than a merge.
- **PDF export** uses the browser's print dialog ("Save as PDF") rather than a direct download.
- **Markdown export** drops text and highlight colors and underline (Markdown has no syntax for them).
- **Comments by viewers** store the quoted text but aren't highlighted inline, because viewers can't modify the document.

### Not built (scope cuts, explained in ARCHITECTURE.md)
- Suggestion/track-changes mode (paid-only TipTap extension; too large to build safely in the timebox)
- Signup, password reset, OAuth (seeded users allowed by the brief)

### Next with another 2–4 hours
1. Real-time co-editing with Yjs + the TipTap collaboration extension
2. Playwright end-to-end test of login → create → share → viewer access
3. Rate limiting on login and upload signing
4. Direct PDF and `.docx` export
