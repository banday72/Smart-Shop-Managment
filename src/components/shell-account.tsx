import { getShopContext } from "@/lib/authz";
import { AccountCard } from "./account-card";

export async function ShellAccount() {
  const context = await getShopContext();
  const user = "error" in context ? undefined : { fullName: context.fullName, role: context.role };
  return <AccountCard user={user} />;
}
