<div align="center">

# 📦 Submission: Ajaia AI-Native Assessment

**Sagar Rajak** · Junior AI Engineer

| | |
|---|---|
| 🌐 **Live product** | **https://ajaia-collab-docs-eight.vercel.app** |
| 💻 **Source** | https://github.com/sagarrajak245/ajaia-collab-docs |
| 🎥 **Walkthrough video** | see [`VIDEO_URL.txt`](VIDEO_URL.txt) |

</div>

---

## 🔑 Test accounts

Password for all: **`password123`** · the login page has one-click buttons.

| Email | Role in the seeded data |
|---|---|
| `alice@ajaia.test` | Owner of *Welcome to Ajaia Docs* |
| `bob@ajaia.test` | Has the welcome doc shared with him as **Editor** |
| `carol@ajaia.test` | No documents; share something with her as **Viewer** |

> 💡 To test sharing and presence, use a second browser or a private window.

---

## 📁 What's included

| Item | Location |
|---|---|
| Source code | `src/`, `tests/`, config files |
| Setup and run instructions | [`README.md`](README.md) |
| Architecture note (priorities, design, trade-offs) | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| AI workflow note | [`AI_WORKFLOW.md`](AI_WORKFLOW.md) |
| Requirements (functional and non-functional) | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) |
| Decision log (who decided what, and why) | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| Build plan | [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) |
| Walkthrough video URL | [`VIDEO_URL.txt`](VIDEO_URL.txt) |
| Environment template | [`.env.example`](.env.example) |
| Database migrations and seed | `src/server/db/migrations/`, `src/server/db/seed.ts` |
| Automated tests (80) | `tests/unit/`, `tests/integration/` |

---

## ✅ Status

### Working end to end

| Area | What works |
|---|---|
| 🔐 Auth | Login with seeded users; protected pages and APIs |
| 📝 Documents | Create, rename, edit, autosave, reopen, delete; formatting stored as structured JSON |
| ✍️ Formatting | Bold, italic, underline, H1–H3, bulleted/numbered lists, text colour, highlight, tables, undo/redo |
| 📤 Import | `.txt` / `.md` / `.docx` (≤ 2 MB) via signed-URL upload + server-side byte sniffing |
| 👥 Sharing | By email with Viewer/Editor roles; change or revoke; *My documents* vs *Shared with me* |
| 💾 Safety | Conflict-safe saves (409 on a stale version) |
| 🟢 Collaboration | Presence avatars (viewing / editing), anchored comments with replies and resolve |
| 🕓 History & export | Version history with non-destructive restore; Markdown export; PDF via print |

### ⚠️ Partial or limited (deliberate)

| Limitation | Why |
|---|---|
| **Presence + conflict detection, not simultaneous co-editing** | Two editors typing at once get a "Conflict – Reload" prompt rather than a merge. CRDT co-editing didn't fit the timebox safely |
| **PDF export** uses the print dialog ("Save as PDF") | Zero dependencies, selectable text |
| **Markdown export** drops colours and underline | Markdown has no syntax for them |
| **Viewer comments** aren't highlighted inline | Viewers can't modify the document; the quoted text is stored instead |

### ✂️ Not built (scope cuts, explained in ARCHITECTURE.md)

- **Suggestion / track-changes mode.** It's a paid TipTap extension and too large to build safely in the timebox.
- **Signup, password reset, OAuth.** The brief allows seeded users.

### ⏭️ Next with another 2–4 hours

1. Real-time co-editing with **Yjs** + the TipTap collaboration extension
2. **Playwright** end-to-end test of login → create → share → viewer access
3. **Rate limiting** on login and upload signing
4. Direct PDF and `.docx` export
