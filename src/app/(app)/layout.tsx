import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AccountCardFallback } from "@/components/account-card";
import { ShellAccount } from "@/components/shell-account";
import { ShellAdminNav } from "@/components/shell-admin-nav";
import { ShellMessagesBadge } from "@/components/shell-messages-badge";
import { ShellStoreLink } from "@/components/shell-store-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      sidebarStoreLink={<Suspense fallback={null}><ShellStoreLink variant="sidebar" /></Suspense>}
      headerStoreLink={<Suspense fallback={null}><ShellStoreLink variant="header" /></Suspense>}
      messagesBadge={<Suspense fallback={null}><ShellMessagesBadge /></Suspense>}
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
