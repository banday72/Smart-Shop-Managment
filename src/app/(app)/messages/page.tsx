import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { TeamChat } from "./chat";

export default async function MessagesPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("noShop" in context ? "/setup" : "/dashboard");
  const { supabase, shopId, userId } = context;

  const [{ data: messages }, { data: members }] = await Promise.all([
    supabase
      .from("team_messages")
      .select("id,sender_id,body,created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("shop_members").select("user_id,full_name,role").eq("shop_id", shopId),
  ]);

  const initial = (messages ?? []).slice().reverse();
  const memberMap = Object.fromEntries(
    (members ?? []).map((m) => [m.user_id, { name: m.full_name || "Team member", role: m.role as string }]),
  );

  return <TeamChat shopId={shopId} userId={userId} initialMessages={initial} members={memberMap} />;
}
