import Link from "next/link";
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
import { connection } from "next/server";
import { AdminShell } from "@/components/admin-shell";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardStats } from "@/lib/dashboard";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const result = await getDashboardStats();
  if (result.configured && !result.authenticated) redirect("/login");
  const { stats } = result;
  const greetingName = result.fullName || result.role || "owner";
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

  return <AdminShell title={`Good morning, ${greetingName}`} description={today} action={<Link href="/pos" className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Open POS</Link>}>
    <div className="space-y-6">
      {!result.configured && <SetupBanner />}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total products" value={formatNumber(stats.products)} detail="Active catalog items" icon={PackageSearch} accent="gold" />
        <MetricCard label="Stock quantity" value={formatNumber(stats.stockQuantity)} detail="Units currently on hand" icon={Boxes} accent="blue" />
        <MetricCard label="Today's sales" value={formatCurrency(stats.todaysSales)} detail="Completed transactions" icon={WalletCards} accent="green" />
        <MetricCard label="Estimated gross profit" value={formatCurrency(stats.grossProfit)} detail="Based on recorded COGS" icon={CircleDollarSign} accent="purple" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Performance</p><h2 className="mt-2 text-lg font-semibold">Sales overview</h2><p className="mt-1 text-sm text-slate-500">Last 7 days from completed sales</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live data</span></div>
          <div className="mt-8 flex h-52 items-end gap-3">{(stats.salesByDay.length ? stats.salesByDay : [{ label: "—", amount: 0 }]).map((day) => <div key={day.label} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-xl bg-gradient-to-t from-[#0b1220] to-[#d6a84f]" style={{ height: `${Math.max(4, Math.min(100, day.amount / Math.max(...stats.salesByDay.map((entry) => entry.amount), 1) * 100))}%` }} /><span className="text-xs text-slate-500">{day.label}</span></div>)}</div>
        </div>
        <div className="rounded-3xl border bg-[#0b1220] p-5 text-white shadow-sm sm:p-6">
          <p className="eyebrow text-amber-300">Inventory health</p><h2 className="mt-2 text-lg font-semibold">Needs attention</h2><p className="mt-1 text-sm text-slate-400">Keep your shelves moving.</p>
          <div className="mt-6 space-y-3"><DarkHealthRow href="/products" label="Low stock" value={stats.lowStock} icon={AlertTriangle} /><DarkHealthRow href="/products" label="Out of stock" value={stats.outOfStock} icon={PackageSearch} /><DarkHealthRow href="/purchases" label="Today's purchases" value={formatCurrency(stats.todaysPurchases)} icon={ArrowDownToLine} /></div>
        </div>
      </section>
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Shortcuts</p><h2 className="mt-2 text-lg font-semibold">Move faster</h2></div><Link href="/reports" className="flex items-center gap-1 text-sm font-semibold text-amber-700">View reports <ArrowUpRight className="h-4 w-4" /></Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><QuickAction href="/pos" label="Start a sale" detail="Open checkout" icon={ShoppingCart} /><QuickAction href="/products" label="Add product" detail="Update catalog" icon={FilePlus2} /><QuickAction href="/purchases" label="Record purchase" detail="Bring stock in" icon={Truck} /><QuickAction href="/reports" label="View reports" detail="Track performance" icon={CircleDollarSign} /></div>
      </section>
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Activity</p><h2 className="mt-2 text-lg font-semibold">Recent sales</h2></div><Link href="/reports" className="text-sm font-semibold text-amber-700">Sales history</Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="border-b text-[10px] uppercase tracking-[0.18em] text-slate-400"><tr><th className="pb-3 font-semibold">Invoice</th><th className="pb-3 font-semibold">Time</th><th className="pb-3 font-semibold">Payment</th><th className="pb-3 text-right font-semibold">Amount</th></tr></thead><tbody>{stats.recentSales.length ? stats.recentSales.map((sale) => <tr key={sale.id} className="border-b last:border-0"><td className="py-4 font-semibold text-slate-800">{sale.invoice_number}</td><td className="py-4 text-slate-500">{new Date(sale.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</td><td className="py-4 capitalize text-slate-500">{sale.payment_method}</td><td className="py-4 text-right font-semibold text-slate-800">{formatCurrency(Number(sale.total))}</td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-slate-500">No sales recorded yet.</td></tr>}</tbody></table></div></section>
    </div>
  </AdminShell>;
}

function SetupBanner() { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Connect Supabase to activate live data.</strong><p className="mt-1 text-amber-800">Add your project keys to <code>.env.local</code> and run the migrations.</p></div>; }
function QuickAction({ href, label, detail, icon: Icon }: { href: string; label: string; detail: string; icon: typeof Boxes }) { return <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/40"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-700"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-amber-600" /></Link>; }
function MetricCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string; detail: string; icon: typeof Boxes; accent: "gold" | "blue" | "green" | "purple" }) { const accents = { gold: "bg-amber-100 text-amber-700", blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700", purple: "bg-violet-100 text-violet-700" }; return <div className="rounded-3xl border bg-white p-5 shadow-sm"><span className={`inline-flex rounded-2xl p-3 ${accents[accent]}`}><Icon className="h-5 w-5" /></span><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>; }
function DarkHealthRow({ href, label, value, icon: Icon }: { href: string; label: string; value: number | string; icon: typeof Boxes }) { return <Link href={href} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-2 text-amber-300"><Icon className="h-4 w-4" /></span><span className="text-sm text-slate-300">{label}</span></div><span className="font-semibold text-white">{value}</span></Link>; }
