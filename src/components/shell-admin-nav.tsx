import { getShopContext } from "@/lib/authz";
import { AdminNavGroup } from "./admin-nav-group";

export async function ShellAdminNav() {
  const context = await getShopContext();
  if ("error" in context || !["owner", "manager"].includes(context.role)) return null;
  return <AdminNavGroup />;
}
