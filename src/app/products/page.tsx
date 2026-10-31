import Link from "next/link";
import { connection } from "next/server";
import { Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ProductForm } from "./product-form";
import { ArchiveProductButton } from "./product-actions";

export const instant = false;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { edit } = await searchParams;
  const [{ data: products, error }, { data: categories }, { data: suppliers }, { data: editing }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, brand, purchase_price, selling_price, current_stock, minimum_stock")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("suppliers").select("id,name").order("name"),
    edit
      ? supabase
          .from("products")
          .select("id,name,sku,barcode,brand,category_id,supplier_id,purchase_price,selling_price,minimum_stock,current_stock")
          .eq("id", edit)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <AppShell title="Products" description="Manage your catalog, stock thresholds, and product details." action={<Link href="/pos" className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white">Open POS</Link>}>
      <div className="space-y-6">
        <ProductForm key={editing?.id ?? "new"} initial={editing} categories={categories ?? []} suppliers={suppliers ?? []} />
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="eyebrow">Catalog</p><h2 className="mt-2 text-lg font-semibold">Active products</h2><p className="mt-1 text-sm text-slate-500">{formatNumber(products?.length ?? 0)} products</p></div>
          </div>
          {error ? <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.message}</p> : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b text-[10px] uppercase tracking-[0.18em] text-slate-400"><tr><th className="pb-3 font-semibold">Product</th><th className="pb-3 font-semibold">SKU</th><th className="pb-3 font-semibold">Stock</th><th className="pb-3 font-semibold">Prices</th><th className="pb-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody>
                  {products?.length ? products.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="py-4"><p className="font-semibold text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.brand || "No brand"}</p></td>
                      <td className="py-4 text-slate-500">{product.sku}</td>
                      <td className="py-4"><span className={Number(product.current_stock) <= Number(product.minimum_stock) ? "font-semibold text-amber-600" : "text-slate-600"}>{formatNumber(Number(product.current_stock))} units</span></td>
                      <td className="py-4 text-slate-500">{formatCurrency(Number(product.selling_price))}<span className="block text-xs text-slate-400">cost {formatCurrency(Number(product.purchase_price))}</span></td>
                      <td className="py-4"><div className="flex items-center justify-end gap-3"><Link href={`/products?edit=${product.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"><Pencil className="h-3.5 w-3.5" />Edit</Link><ArchiveProductButton productId={product.id} /></div></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="py-10 text-center text-slate-500">No active products yet. Add your first product above.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
