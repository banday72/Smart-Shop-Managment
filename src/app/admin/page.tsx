import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, PackagePlus, ShoppingCart, Truck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const instant = false;

export default async function ShopPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("shop_id,role").eq("id", auth.user.id).single();
  if (!profile || !["owner", "manager"].includes(profile.role)) redirect("/dashboard");
  const [{ data: shop }, { data: products }, { data: sales }] = await Promise.all([
    supabase.from("shops").select("name").eq("id", profile.shop_id).single(),
    supabase.from("products").select("id,current_stock").eq("shop_id", profile.shop_id).eq("is_active", true),
    supabase.from("sales").select("total").eq("shop_id", profile.shop_id).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);
  const productCount = products?.length ?? 0;
  const stockCount = (products ?? []).reduce((sum, product) => sum + Number(product.current_stock), 0);
  const salesTotal = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-5 py-5 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back</Link>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">{shop?.name ?? "My Shop"}</h1>
        <p className="mt-1 text-slate-500">What do you want to do?</p>
      </header>
      <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <Action href="/products" icon={PackagePlus} title="Add Product" detail="Add a new item to your shop" color="teal" />
          <Action href="/purchases" icon={Truck} title="Add Stock" detail="Enter products received from supplier" color="blue" />
          <Action href="/pos" icon={ShoppingCart} title="New Sale" detail="Sell products to a customer" color="amber" />
          <Action href="/reports" icon={BarChart3} title="View Reports" detail="See sales, stock and profit" color="violet" />
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <SmallStat label="Products" value={formatNumber(productCount)} />
          <SmallStat label="Stock available" value={formatNumber(stockCount)} />
          <SmallStat label="Today sales" value={formatCurrency(salesTotal)} />
        </section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Simple steps</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Step number="1" title="Add Product" text="Enter name, price and SKU." />
            <Step number="2" title="Add Stock" text="Enter the quantity received." />
            <Step number="3" title="New Sale" text="Choose the product and complete payment." />
          </div>
          <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">After a sale, stock decreases automatically. Reports and dashboard update automatically.</p>
        </section>
      </div>
    </main>
  );
}

function Action({ href, icon: Icon, title, detail, color }: { href: string; icon: typeof PackagePlus; title: string; detail: string; color: "teal" | "blue" | "amber" | "violet" }) {
  const colors = { teal: "bg-teal-50 text-teal-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" };
  return <Link href={href} className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 sm:p-6"><span className={`rounded-2xl p-4 ${colors[color]}`}><Icon className="h-7 w-7" /></span><span className="min-w-0 flex-1"><span className="block text-xl font-bold text-slate-900">{title}</span><span className="mt-1 block text-sm text-slate-500">{detail}</span></span><ArrowRight className="h-5 w-5 text-slate-300" /></Link>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 font-semibold text-white">{number}</span><div><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>;
}
