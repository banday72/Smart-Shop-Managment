import { AdminShell } from "@/components/admin-shell";
import { getShopContext } from "@/lib/authz";

export async function AppShell({
  children,
  title,
  description,
  action,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const context = await getShopContext();
  const user = "error" in context ? undefined : { fullName: context.fullName, role: context.role };

  return (
    <AdminShell title={title} description={description} action={action} user={user}>
      {children}
    </AdminShell>
  );
}
