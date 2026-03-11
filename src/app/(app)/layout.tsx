import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  return <Shell email={user.email} isAdmin={user.isAdmin}>{children}</Shell>;
}
