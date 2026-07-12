import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth/session";

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
