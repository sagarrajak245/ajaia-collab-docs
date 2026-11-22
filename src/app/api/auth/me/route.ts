/** GET /api/auth/me: the current user (401 when not logged in). */
import { apiHandler } from "@/server/middleware/api-handler";

export const GET = apiHandler({}, async ({ user }) => ({
  user: { id: user.userId, email: user.email, name: user.name },
}));
