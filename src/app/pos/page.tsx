import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";
import { AppShell } from "@/components/app-shell";

export const instant = false;

export default async function PosPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");
  const { data: products } = await supabase.from("products").select("id, name, sku, barcode, selling_price, current_stock").eq("is_active", true).gt("current_stock", 0).order("name");
  return <AppShell title="Point of sale" description="Search products, build a cart, and complete an atomic sale."><PosClient products={(products ?? []) as never} /></AppShell>;
}
