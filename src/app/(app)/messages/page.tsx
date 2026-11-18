import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { DirectMessages } from "./chat";

export default async function MessagesPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("noShop" in context ? "/setup" : "/dashboard");
  const { supabase, shopId, userId } = context;

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase.from("shop_members").select("user_id,full_name,role").eq("shop_id", shopId).order("full_name"),
    supabase
      .from("direct_messages")
      .select("id,sender_id,recipient_id,body,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  return (
    <DirectMessages
      shopId={shopId}
      userId={userId}
      members={(members ?? []) as { user_id: string; full_name: string; role: string }[]}
      initialMessages={(messages ?? []) as { id: string; sender_id: string; recipient_id: string; body: string | null; created_at: string; read_at: string | null; attachment_path: string | null; attachment_name: string | null; attachment_type: string | null; attachment_size: number | null }[]}
    />
  );
}
