import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ProductForm } from "./product-form";
import { ArchiveProductButton } from "./product-actions";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default async function ProductsPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: products, error } = await supabase.from("products").select("id, name, sku, brand, purchase_price, selling_price, current_stock, minimum_stock").eq("is_active", true).order("created_at", { ascending: false });

  return <AdminShell title="Products" description="Manage your active catalog and stock thresholds." action={<Link href="/pos" className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white">Open POS</Link>}><div className="space-y-6"><ProductForm /><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Catalog</p><h2 className="mt-2 text-lg font-semibold">Active products</h2><p className="mt-1 text-sm text-slate-500">{formatNumber(products?.length ?? 0)} products</p></div><div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-slate-400"><Search className="h-4 w-4" />Search available soon</div></div>{error ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.message}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-[10px] uppercase tracking-[0.18em] text-slate-400"><tr><th className="pb-3 font-semibold">Product</th><th className="pb-3 font-semibold">SKU</th><th className="pb-3 font-semibold">Stock</th><th className="pb-3 font-semibold">Prices</th><th className="pb-3 text-right font-semibold">Action</th></tr></thead><tbody>{products?.length ? products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="py-4"><p className="font-semibold text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.brand || "No brand"}</p></td><td className="py-4 text-slate-500">{product.sku}</td><td className="py-4"><span className={Number(product.current_stock) <= Number(product.minimum_stock) ? "font-semibold text-amber-600" : "text-slate-600"}>{formatNumber(Number(product.current_stock))} units</span></td><td className="py-4 text-slate-500">{formatCurrency(Number(product.selling_price))}<span className="text-xs text-slate-400"> / cost {formatCurrency(Number(product.purchase_price))}</span></td><td className="py-4 text-right"><ArchiveProductButton productId={product.id} /></td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-slate-500">No products yet. Add your first product above.</td></tr>}</tbody></table></div>}</section></div></AdminShell>;
}
