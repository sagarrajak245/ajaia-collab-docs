/** GET /api/users: demo user directory (for the share dialog's suggestions). */
import { getContainer } from "@/server/container";
import { apiHandler } from "@/server/middleware/api-handler";

export const GET = apiHandler({}, async ({ user }) => {
  const all = await getContainer().userRepository.listAll();
  return all
    .filter((u) => u.id !== user.userId)
    .map((u) => ({ id: u.id, email: u.email, name: u.name }));
});
