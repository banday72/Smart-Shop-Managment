import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AccountCardFallback } from "@/components/account-card";
import { ShellAccount } from "@/components/shell-account";
import { ShellAdminNav } from "@/components/shell-admin-nav";
import { getShopContext } from "@/lib/authz";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getShopContext();
  const storeHref = "error" in context ? "/store" : `/store?shop=${context.shopId}`;
  return (
    <AdminShell
      storeHref={storeHref}
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
