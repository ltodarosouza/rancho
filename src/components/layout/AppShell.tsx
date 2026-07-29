import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-grid bg-[size:24px_24px]">
        <Sidebar />
        <div className="lg:pl-72">
          <Header />
          <div className="h-[61px] md:h-[77px]" aria-hidden="true" />
          <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
