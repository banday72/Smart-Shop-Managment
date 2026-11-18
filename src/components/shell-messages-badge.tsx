import { getShopContext } from "@/lib/authz";
import { MessagesBadge } from "./message-notifier";

export async function ShellMessagesBadge() {
  const context = await getShopContext();
  if ("error" in context) return null;
  return <MessagesBadge shopId={context.shopId} userId={context.userId} />;
}
