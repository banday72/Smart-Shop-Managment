import { getShopContext } from "@/lib/authz";
import { AccountCard } from "./account-card";
import { ShopSwitcher } from "./shop-switcher";

export async function ShellAccount() {
  const context = await getShopContext();
  if ("error" in context) return <AccountCard user={undefined} />;
  const { data: memberships } = await context.supabase
    .from("shop_members")
    .select("shop_id,role,shops(name)")
    .eq("user_id", context.userId)
    .order("created_at");
  const shops = (memberships ?? []).map((membership) => {
    const shop = Array.isArray(membership.shops) ? membership.shops[0] : membership.shops;
    return { id: membership.shop_id, role: membership.role, name: shop?.name ?? "Shop" };
  });
  return (
    <>
      <ShopSwitcher shops={shops} activeShopId={context.shopId} />
      <AccountCard user={{ fullName: context.fullName, role: context.role }} />
    </>
  );
}
