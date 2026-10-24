import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const start = new Date(); start.setDate(start.getDate() - 30);
  const [{ data: sales }, { data: purchases }, { data: expenses }] = await Promise.all([
    supabase.from("sales").select("invoice_number,total,gross_profit,payment_method,created_at").gte("created_at", start.toISOString()).order("created_at", { ascending: false }),
    supabase.from("purchases").select("invoice_number,total,status,purchased_at").gte("purchased_at", start.toISOString().slice(0, 10)),
    supabase.from("expenses").select("category,amount,expense_date").gte("expense_date", start.toISOString().slice(0, 10)),
  ]);
  const revenue = (sales ?? []).reduce((s, r) => s + Number(r.total), 0);
  const grossProfit = (sales ?? []).reduce((s, r) => s + Number(r.gross_profit), 0);
  const expenseTotal = (expenses ?? []).reduce((s, r) => s + Number(r.amount), 0);
  return <main className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-slate-900">Reports</h1><p className="mt-1 text-sm text-slate-500">Performance for the last 30 days.</p></div><a href="/api/reports/sales" className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><Download className="h-4 w-4" />Export sales CSV</a></div></header><div className="space-y-6 p-5 sm:p-8"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card label="Revenue" value={formatCurrency(revenue)} /><Card label="Gross profit" value={formatCurrency(grossProfit)} /><Card label="Expenses" value={formatCurrency(expenseTotal)} /><Card label="Estimated net profit" value={formatCurrency(grossProfit - expenseTotal)} /></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Sales report</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-400"><tr><th className="pb-3">Invoice</th><th className="pb-3">Date</th><th className="pb-3">Payment</th><th className="pb-3 text-right">Revenue</th><th className="pb-3 text-right">Gross profit</th></tr></thead><tbody>{sales?.map((sale) => <tr key={sale.invoice_number} className="border-b last:border-0"><td className="py-3 font-medium">{sale.invoice_number}</td><td className="py-3 text-slate-500">{new Date(sale.created_at).toLocaleDateString("en-PK")}</td><td className="py-3 capitalize text-slate-500">{sale.payment_method}</td><td className="py-3 text-right">{formatCurrency(Number(sale.total))}</td><td className="py-3 text-right">{formatCurrency(Number(sale.gross_profit))}</td></tr>)}</tbody></table>{!sales?.length && <p className="py-8 text-center text-sm text-slate-500">No sales in this period.</p>}</div></section><section className="grid gap-6 lg:grid-cols-2"><ReportList title="Purchases" rows={(purchases ?? []).map((p) => `${p.invoice_number || "No invoice"} · ${formatCurrency(Number(p.total))} · ${p.status}`)} /><ReportList title="Expenses" rows={(expenses ?? []).map((e) => `${e.category} · ${formatCurrency(Number(e.amount))} · ${e.expense_date}`)} /></section></div></main>;
}

function Card({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>; }
function ReportList({ title, rows }: { title: string; rows: string[] }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-2">{rows.length ? rows.map((row) => <p key={row} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{row}</p>) : <p className="py-5 text-sm text-slate-500">No records in this period.</p>}</div></div>; }
