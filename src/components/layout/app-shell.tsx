import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { AuthenticatedUser } from "@/server/auth/session";

type AppShellProps = {
  children: React.ReactNode;
  user: AuthenticatedUser;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-72">
        <Topbar user={user} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
