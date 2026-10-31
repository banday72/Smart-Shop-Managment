import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { ReceiveButton } from "./purchase-client";
import { PurchaseForm } from "./purchase-form";

export const instant = false;

export default async function PurchasesPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  const [{ data: purchases }, { data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("purchases").select("id, invoice_number, status, total, purchased_at, suppliers(name)").order("created_at", { ascending: false }),
    supabase.from("products").select("id,name,purchase_price").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id,name").order("name"),
  ]);

  return (
    <AppShell title="Purchases & stock-in" description="Only received purchases update stock through the database transaction.">
      <div className="space-y-6">
        <PurchaseForm products={products ?? []} suppliers={suppliers ?? []} />
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">History</p><h2 className="mt-2 text-lg font-semibold">Purchase orders</h2></div><p className="text-sm text-slate-500">{purchases?.length ?? 0} orders</p></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b text-[10px] uppercase tracking-[0.18em] text-slate-400"><tr><th className="pb-3">Invoice</th><th className="pb-3">Supplier</th><th className="pb-3">Date</th><th className="pb-3">Total</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody>
                {purchases?.length ? purchases.map((purchase) => {
                  const supplier = purchase.suppliers as { name?: string } | null;
                  return (
                    <tr key={purchase.id} className="border-b last:border-0">
                      <td className="py-4 font-semibold text-slate-800">{purchase.invoice_number || "No invoice"}</td>
                      <td className="py-4 text-slate-500">{supplier?.name || "No supplier"}</td>
                      <td className="py-4 text-slate-500">{purchase.purchased_at}</td>
                      <td className="py-4 text-slate-500">{formatCurrency(Number(purchase.total))}</td>
                      <td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${purchase.status === "received" ? "bg-emerald-50 text-emerald-700" : purchase.status === "cancelled" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{purchase.status}</span></td>
                      <td className="py-4 text-right">{purchase.status === "pending" ? <ReceiveButton id={purchase.id} /> : <span className="text-xs text-slate-400">No action</span>}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={6} className="py-10 text-center text-slate-500">No purchases recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
