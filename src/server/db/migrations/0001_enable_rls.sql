-- Lock down Supabase's auto-generated REST API (PostgREST).
--
-- Supabase exposes every table in the `public` schema over REST to anyone
-- holding the anon key, and that key is public (it ships to the browser for
-- Realtime presence). Without RLS, anyone could read `users.password_hash`
-- or any document straight from the REST API, bypassing our authorization.
--
-- Enabling RLS with NO policies denies all access to the `anon` and
-- `authenticated` roles. Our server connects as the table owner (postgres),
-- which bypasses RLS, so the app keeps working, and all access goes through
-- our API, where the access policy is enforced.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;
