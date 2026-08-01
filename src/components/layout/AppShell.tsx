import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-[var(--bg)]">
        <Sidebar />
        <div className="lg:pl-56">
          <Header />
          <div className="h-[52px]" aria-hidden="true" />
          <main className="mx-auto max-w-[1200px] p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
