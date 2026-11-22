import { redirect } from "next/navigation";

/** The dashboard is the app's home; middleware/login handle unauthenticated users. */
export default function Home() {
  redirect("/documents");
}
