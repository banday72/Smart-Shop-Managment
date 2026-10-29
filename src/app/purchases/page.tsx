import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { ReceiveButton } from "./purchase-client";
import { createPurchaseWithItems } from "./actions";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default async function PurchasesPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const [{ data: purchases }, { data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("purchases").select("id, invoice_number, status, total, purchased_at, suppliers(name)").order("created_at", { ascending: false }),
    supabase.from("products").select("id,name,purchase_price").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id,name").order("name"),
  ]);
  async function submit(formData: FormData) {
    'use server';
    await createPurchaseWithItems(formData);
  }
  return <AdminShell title="Purchases & stock-in" description="Only received purchases update stock through the database transaction."><div className="space-y-6"><form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">Inventory inbound</p><h2 className="mt-2 text-lg font-semibold">Create purchase order</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field name="invoiceNumber" label="Invoice number" /><Field name="purchasedAt" label="Purchase date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /><label className="text-sm font-medium text-slate-700">Supplier<select name="supplierId" className="mt-1.5 w-full rounded-xl border px-3 py-2.5"><option value="">No supplier</option>{suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Product<select required name="productId" className="mt-1.5 w-full rounded-xl border px-3 py-2.5"><option value="">Select product</option>{products?.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Field name="quantity" label="Quantity" type="number" defaultValue="1" /><Field name="unitCost" label="Unit cost (PKR)" type="number" defaultValue="0" /></div><button className="mt-5 rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white">Create purchase</button></form><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-[10px] uppercase tracking-[0.18em] text-slate-400"><tr><th className="pb-3">Invoice</th><th className="pb-3">Supplier</th><th className="pb-3">Date</th><th className="pb-3">Total</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th></tr></thead><tbody>{purchases?.length ? purchases.map((purchase) => <tr key={purchase.id} className="border-b last:border-0"><td className="py-4 font-semibold">{purchase.invoice_number || "No invoice"}</td><td className="py-4 text-slate-500">Supplier</td><td className="py-4 text-slate-500">{purchase.purchased_at}</td><td className="py-4">{formatCurrency(Number(purchase.total))}</td><td className="py-4 capitalize">{purchase.status}</td><td className="py-4 text-right">{purchase.status === "pending" && <ReceiveButton id={purchase.id} />}</td></tr>) : <tr><td colSpan={6} className="py-12 text-center text-slate-500">No purchase orders recorded.</td></tr>}</tbody></table></div></section></div></AdminShell>;
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) { return <label className="text-sm font-medium text-slate-700">{label}<input name={name} type={type} defaultValue={defaultValue} required={name === "productId" || name === "quantity" || name === "unitCost"} min={type === "number" ? "0" : undefined} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>; }
