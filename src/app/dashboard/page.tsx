import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  FilePlus2,
  PackageSearch,
  ShoppingCart,
  Truck,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardStats } from "@/lib/dashboard";
import { connection } from "next/server";

export const instant = false;

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Boxes },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Point of Sale", href: "/pos", icon: ShoppingCart },
  { label: "Purchases", href: "/purchases", icon: ArrowDownToLine },
  { label: "Suppliers", href: "/suppliers", icon: PackageSearch },
  { label: "Customers", href: "/customers", icon: WalletCards },
  { label: "Reports", href: "/reports", icon: CircleDollarSign },
  { label: "Expenses", href: "/expenses", icon: CircleDollarSign },
  { label: "Settings", href: "/settings", icon: Boxes },
];

export default async function DashboardPage() {
  await connection();
  const result = await getDashboardStats();
  if (result.configured && !result.authenticated) redirect("/login");

  const { stats } = result;
  const greetingName = result.fullName || result.role || "owner";
  const today = new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white px-4 py-6 lg:block">
        <div className="mb-9 flex items-center gap-3 px-3">
          <Image src="/shop-management-logo.png" alt="Shop Management" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
          <div><p className="font-semibold text-slate-900">Banday Mart</p><p className="text-xs text-slate-500">Shop management</p></div>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ label, href, icon: Icon }, index) => (
            <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${index === 0 ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
          {["owner", "manager"].includes(result.role) && <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><Boxes className="h-4 w-4" />Shop</Link>}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-sm font-semibold">Need help?</p><p className="mt-1 text-xs text-slate-300">Configure your shop and team from settings.</p>
        </div>
      </aside>
      <main className="lg:pl-64">
        <header className="flex items-center justify-between border-b bg-white px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Image src="/shop-management-logo.png" alt="Shop Management" width={144} height={64} className="h-14 w-36 rounded-xl object-cover object-center shadow-sm lg:hidden" />
            <div><p className="text-sm text-slate-500">{today}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Good morning, {greetingName}</h1></div>
          </div>
          <Link href="/pos" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Open POS</Link>
        </header>
        <div className="space-y-6 p-5 sm:p-8">
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Mobile navigation">
              {navItems.map(({ label, href, icon: Icon }, index) => (
                <Link key={label} href={href} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${index === 0 ? "border-teal-200 bg-teal-50 text-teal-700" : "bg-white text-slate-600"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
              {["owner", "manager"].includes(result.role) && <Link href="/admin" className="flex shrink-0 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-600"><Boxes className="h-4 w-4" />Shop</Link>}
            </nav>
            {!result.configured && <SetupBanner />}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total products" value={formatNumber(stats.products)} icon={PackageSearch} tint="teal" detail="Active catalog items" />
            <MetricCard label="Stock quantity" value={formatNumber(stats.stockQuantity)} icon={Boxes} tint="blue" detail="Units currently on hand" />
            <MetricCard label="Today's sales" value={formatCurrency(stats.todaysSales)} icon={WalletCards} tint="amber" detail="Completed transactions" />
            <MetricCard label="Estimated gross profit" value={formatCurrency(stats.grossProfit)} icon={CircleDollarSign} tint="violet" detail="Based on recorded COGS" />
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-900">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-500">Jump straight to the tasks you do most often.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction href="/pos" label="Start a sale" detail="Open the checkout" icon={ShoppingCart} />
              <QuickAction href="/products" label="Add product" detail="Update your catalog" icon={FilePlus2} />
              <QuickAction href="/purchases" label="Record purchase" detail="Bring stock in" icon={Truck} />
              <QuickAction href="/reports" label="View reports" detail="Track performance" icon={CircleDollarSign} />
            </div>
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-900">Sales overview</h2><p className="mt-1 text-sm text-slate-500">Last 7 days from completed sales</p></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Live data</span></div>
              <div className="mt-8 flex h-48 items-end gap-3">{(stats.salesByDay.length ? stats.salesByDay : [{ label: "—", amount: 0 }]).map((day) => <div key={day.label} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-teal-500/80" style={{ height: `${Math.max(4, Math.min(100, day.amount / Math.max(...stats.salesByDay.map((entry) => entry.amount), 1) * 100))}%` }} /><span className="text-xs text-slate-500">{day.label}</span></div>)}</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-900">Inventory health</h2><p className="mt-1 text-sm text-slate-500">Products requiring attention</p></div><Link href="/products" className="text-sm font-medium text-teal-700">View all</Link></div><div className="mt-6 space-y-3"><HealthRow href="/products" label="Low stock" value={stats.lowStock} icon={AlertTriangle} color="amber" /><HealthRow href="/products" label="Out of stock" value={stats.outOfStock} icon={PackageSearch} color="rose" /><HealthRow href="/purchases" label="Today's purchases" value={formatCurrency(stats.todaysPurchases)} icon={ArrowDownToLine} color="blue" /></div></div>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Recent sales</h2><p className="mt-1 text-sm text-slate-500">Latest completed transactions</p></div><Link href="/reports" className="flex items-center gap-1 text-sm font-medium text-teal-700">Sales history <ArrowUpRight className="h-4 w-4" /></Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Invoice</th><th className="pb-3 font-medium">Time</th><th className="pb-3 font-medium">Payment</th><th className="pb-3 text-right font-medium">Amount</th></tr></thead><tbody>{stats.recentSales.length ? stats.recentSales.map((sale) => <tr key={sale.id} className="border-b last:border-0"><td className="py-4 font-medium text-slate-800">{sale.invoice_number}</td><td className="py-4 text-slate-500">{new Date(sale.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</td><td className="py-4 capitalize text-slate-500">{sale.payment_method}</td><td className="py-4 text-right font-semibold text-slate-800">{formatCurrency(Number(sale.total))}</td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-slate-500">No sales recorded yet.</td></tr>}</tbody></table></div></section>
        </div>
      </main>
    </div>
  );
}

function SetupBanner() {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" /><div><h2 className="font-semibold text-amber-900">Connect Supabase to activate live data</h2><p className="mt-1 text-sm text-amber-800">Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to <code className="rounded bg-amber-100 px-1">.env.local</code>, add your project keys, and run the migration in <code className="rounded bg-amber-100 px-1">supabase/migrations</code>.</p></div></div></div>;
}

function QuickAction({ href, label, detail, icon: Icon }: { href: string; label: string; detail: string; icon: typeof Boxes }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/50"><span className="rounded-lg bg-teal-50 p-2 text-teal-600 group-hover:bg-white"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-teal-600" /></Link>;
}

function MetricCard({ label, value, detail, icon: Icon, tint }: { label: string; value: string; detail: string; icon: typeof Boxes; tint: "teal" | "blue" | "amber" | "violet" }) {
  const tintClasses = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  }[tint];
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className={`rounded-xl p-2.5 ${tintClasses}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-slate-300" /></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

function HealthRow({ href, label, value, icon: Icon, color }: { href: string; label: string; value: number | string; icon: typeof Boxes; color: "amber" | "rose" | "blue" }) {
  const colorClasses = {
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    blue: "bg-blue-100 text-blue-600",
  }[color];
  return <Link href={href} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100"><div className="flex items-center gap-3"><span className={`rounded-lg p-2 ${colorClasses}`}><Icon className="h-4 w-4" /></span><span className="text-sm text-slate-600">{label}</span></div><span className="font-semibold text-slate-900">{value}</span></Link>;
}
