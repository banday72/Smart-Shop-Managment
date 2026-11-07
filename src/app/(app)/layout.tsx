import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AccountCardFallback } from "@/components/account-card";
import { ShellAccount } from "@/components/shell-account";
import { ShellAdminNav } from "@/components/shell-admin-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      account={
        <Suspense fallback={<AccountCardFallback />}>
          <ShellAccount />
        </Suspense>
      }
      adminNav={
        <Suspense fallback={null}>
          <ShellAdminNav />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
