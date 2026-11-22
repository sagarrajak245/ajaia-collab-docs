/**
 * Seeds demo users and one sample document (idempotent: safe to re-run).
 *
 *   npm run db:seed
 *
 * Demo accounts (all use password "password123"); listed in the README so
 * reviewers can log in as different people to test sharing.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const DEMO_PASSWORD = "password123";
const DEMO_USERS = [
  { email: "alice@ajaia.test", name: "Alice Johnson" },
  { email: "bob@ajaia.test", name: "Bob Smith" },
  { email: "carol@ajaia.test", name: "Carol Lee" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql, { schema });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of DEMO_USERS) {
    await db
      .insert(schema.users)
      .values({ ...u, passwordHash })
      .onConflictDoNothing({ target: schema.users.email });
  }

  // One welcome document owned by Alice, shared with Bob as editor.
  const [alice] = await db.select().from(schema.users).where(eq(schema.users.email, "alice@ajaia.test"));
  const [bob] = await db.select().from(schema.users).where(eq(schema.users.email, "bob@ajaia.test"));
  const existing = await db.select().from(schema.documents).where(eq(schema.documents.ownerId, alice.id));
  if (existing.length === 0) {
    const [doc] = await db
      .insert(schema.documents)
      .values({
        ownerId: alice.id,
        title: "Welcome to Ajaia Docs",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Ajaia Docs" }] },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "This document is owned by Alice and shared with Bob as an " },
                { type: "text", marks: [{ type: "bold" }], text: "editor" },
                { type: "text", text: "." },
              ],
            },
          ],
        },
      })
      .returning();
    await db.insert(schema.documentShares).values({ documentId: doc.id, userId: bob.id, role: "editor" });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD}).`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
