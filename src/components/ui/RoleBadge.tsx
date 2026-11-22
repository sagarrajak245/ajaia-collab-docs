import type { DocumentRole } from "@/server/constants";

const STYLES: Record<DocumentRole, string> = {
  owner: "bg-slate-100 text-slate-700",
  editor: "bg-blue-50 text-blue-700",
  viewer: "bg-amber-50 text-amber-700",
};
const LABELS: Record<DocumentRole, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };

export function RoleBadge({ role }: { role: DocumentRole }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[role]}`}>
      {LABELS[role]}
    </span>
  );
}
