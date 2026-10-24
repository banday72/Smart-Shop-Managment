import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";

export const instant = false;

export default async function PosPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");
  const { data: products } = await supabase.from("products").select("id, name, sku, barcode, selling_price, current_stock").eq("is_active", true).gt("current_stock", 0).order("name");
  return <main className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="mt-4 text-2xl font-semibold text-slate-900">Point of Sale</h1><p className="mt-1 text-sm text-slate-500">Search products, build a cart, and complete an atomic sale.</p></header><div className="p-5 sm:p-8"><PosClient products={(products ?? []) as never} /></div></main>;
}
