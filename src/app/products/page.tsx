import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ProductForm } from "./product-form";
import { ArchiveProductButton } from "./product-actions";

export const instant = false;

export default async function ProductsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: products, error } = await supabase.from("products").select("id, name, sku, brand, purchase_price, selling_price, current_stock, minimum_stock").eq("is_active", true).order("created_at", { ascending: false });

  return <div className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="mb-3 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-slate-900">Products</h1><p className="mt-1 text-sm text-slate-500">Manage your active catalog and stock thresholds.</p></div><Link href="/pos" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Open POS</Link></div></header><main className="space-y-6 p-5 sm:p-8"><ProductForm /><section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Active catalog</h2><p className="mt-1 text-sm text-slate-500">{formatNumber(products?.length ?? 0)} products</p></div><div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-slate-400"><Search className="h-4 w-4" />Search is available in the next catalog iteration</div></div>{error ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.message}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium">SKU</th><th className="pb-3 font-medium">Stock</th><th className="pb-3 font-medium">Prices</th><th className="pb-3 text-right font-medium">Action</th></tr></thead><tbody>{products?.length ? products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="py-4"><p className="font-medium text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.brand || "No brand"}</p></td><td className="py-4 text-slate-500">{product.sku}</td><td className="py-4"><span className={Number(product.current_stock) <= Number(product.minimum_stock) ? "font-semibold text-amber-600" : "text-slate-600"}>{formatNumber(Number(product.current_stock))} units</span></td><td className="py-4 text-slate-500">{formatCurrency(Number(product.selling_price))}<span className="text-xs text-slate-400"> / cost {formatCurrency(Number(product.purchase_price))}</span></td><td className="py-4 text-right"><ArchiveProductButton productId={product.id} /></td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-slate-500">No products yet. Add your first product above.</td></tr>}</tbody></table></div>}</section></main></div>;
}
