import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("/login");
  const { supabase } = context;
  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase.from("products").select("id, name, sku, barcode, selling_price, current_stock").eq("is_active", true).gt("current_stock", 0).order("name"),
    supabase.from("customers").select("id,name,phone").order("name"),
  ]);
  return <PosClient shopId={context.shopId} products={(products ?? []) as never} customers={(customers ?? []) as never} />;
}
