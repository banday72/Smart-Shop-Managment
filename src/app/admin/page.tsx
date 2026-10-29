import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, Boxes, CircleDollarSign, LayoutDashboard, PackagePlus, ShoppingCart, Users } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ProductForm } from "@/app/products/product-form";

export const instant = false;

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/purchases", label: "Stock in", icon: ArrowDownToLine },
  { href: "/pos", label: "Sell products", icon: ShoppingCart },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: CircleDollarSign },
];

export default async function AdminPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("shop_id,role,full_name").eq("id", auth.user.id).single();
  if (!profile || !["owner", "manager"].includes(profile.role)) redirect("/dashboard");

  const [{ data: shop }, { data: products }, { data: sales }, { data: pendingPurchases }] = await Promise.all([
    supabase.from("shops").select("name").eq("id", profile.shop_id).single(),
    supabase.from("products").select("id,name,sku,current_stock,minimum_stock,selling_price").eq("shop_id", profile.shop_id).eq("is_active", true).order("name"),
    supabase.from("sales").select("id,invoice_number,total,payment_method,created_at").eq("shop_id", profile.shop_id).order("created_at", { ascending: false }).limit(5),
    supabase.from("purchases").select("id").eq("shop_id", profile.shop_id).eq("status", "pending"),
  ]);
  const stock = products ?? [];
  const lowStock = stock.filter((product) => Number(product.current_stock) <= Number(product.minimum_stock));
  const todaySales = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0);

  return (
    <main className="min-h-screen bg-slate-100 lg:flex">
      <aside className="border-b bg-slate-950 text-white lg:min-h-screen lg:w-64 lg:border-0 lg:px-4 lg:py-6">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-2 lg:py-0">
          <div><p className="text-lg font-semibold">{shop?.name ?? "Banday Mart"}</p><p className="text-xs text-slate-400">Shop operations</p></div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white lg:mt-8 lg:flex lg:items-center lg:gap-2 lg:text-sm"><ArrowLeft className="h-4 w-4 lg:inline" /><span className="hidden lg:inline">Dashboard</span></Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:mt-8 lg:block lg:space-y-1 lg:px-0 lg:pb-0">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${href === "/admin" ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</Link>)}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="border-b bg-white px-5 py-6 sm:px-8">
          <p className="text-sm font-medium text-teal-700">Admin workspace · {profile.role}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Run your shop</h1>
          <p className="mt-1 text-sm text-slate-500">Add products, enter stock, sell available items, and review the results.</p>
        </header>
        <div className="space-y-6 p-5 sm:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Products" value={formatNumber(stock.length)} detail="Active catalog" />
            <Stat label="Stock units" value={formatNumber(stock.reduce((sum, product) => sum + Number(product.current_stock), 0))} detail="Available inventory" />
            <Stat label="Low stock" value={formatNumber(lowStock.length)} detail="Needs attention" />
            <Stat label="Recent sales" value={formatCurrency(todaySales)} detail="Latest five transactions" />
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3"><span className="rounded-xl bg-teal-50 p-2 text-teal-600"><PackagePlus className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">1. Add a product</h2><p className="mt-1 text-sm text-slate-500">Create the catalog item first. New products start with zero stock.</p></div></div>
                <div className="mt-5"><ProductForm /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <WorkflowCard href="/purchases" icon={ArrowDownToLine} step="2. Stock in" title="Enter purchase stock" detail={pendingPurchases?.length ? `${pendingPurchases.length} purchase entries waiting to receive` : "Record a purchase and receive it into inventory"} />
                <WorkflowCard href="/pos" icon={ShoppingCart} step="3. Sell" title="Open point of sale" detail="Only products with available stock appear for sale" />
              </div>
            </div>
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Low stock</h2><p className="mt-1 text-sm text-slate-500">Restock before selling out.</p></div><Link href="/products" className="text-sm font-semibold text-teal-700">View all</Link></div><div className="mt-4 space-y-2">{lowStock.length ? lowStock.slice(0, 6).map((product) => <div key={product.id} className="flex items-center justify-between rounded-xl bg-amber-50 p-3"><div><p className="text-sm font-medium text-slate-800">{product.name}</p><p className="text-xs text-slate-500">{product.sku}</p></div><span className="text-sm font-semibold text-amber-700">{formatNumber(Number(product.current_stock))}</span></div>) : <p className="py-5 text-sm text-slate-500">All products have healthy stock.</p>}</div></section>
              <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">4. Recent sales</h2><p className="mt-1 text-sm text-slate-500">Completed POS sales update inventory and reports automatically.</p><div className="mt-4 space-y-2">{sales?.length ? sales.map((sale) => <div key={sale.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-medium text-slate-800">{sale.invoice_number}</p><p className="text-xs capitalize text-slate-500">{sale.payment_method}</p></div><span className="text-sm font-semibold text-slate-800">{formatCurrency(Number(sale.total))}</span></div>) : <p className="py-5 text-sm text-slate-500">No sales recorded yet.</p>}</div></section>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

function WorkflowCard({ href, icon: Icon, step, title, detail }: { href: string; icon: typeof Boxes; step: string; title: string; detail: string }) {
  return <Link href={href} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300"><Icon className="h-5 w-5 text-teal-600" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-700">{step}</p><h2 className="mt-1 font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{detail}</p></Link>;
}
