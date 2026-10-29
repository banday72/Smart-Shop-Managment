import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupplier } from "./actions";

export const instant = false;

export default async function SuppliersPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: suppliers } = await supabase.from("suppliers").select("id,name,phone,email,address").order("name");
  async function submit(formData: FormData) { "use server"; await createSupplier(formData); }
  return <AdminShell title="Suppliers" description="Keep purchasing contacts organised and ready."><div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">New record</p><h2 className="mt-2 text-lg font-semibold">Add supplier</h2><div className="mt-5 space-y-4"><Field name="name" label="Supplier name" required /><Field name="phone" label="Phone" /><Field name="email" label="Email" type="email" /><Field name="address" label="Address" /></div><button className="mt-5 w-full rounded-xl bg-[#0b1220] px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save supplier</button></form><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">Directory</p><h2 className="mt-2 text-lg font-semibold">Supplier list</h2><div className="mt-4 divide-y">{suppliers?.length ? suppliers.map((supplier) => <div key={supplier.id} className="py-4"><p className="font-semibold text-slate-800">{supplier.name}</p><p className="mt-1 text-sm text-slate-500">{supplier.phone || "No phone"} · {supplier.email || "No email"}</p><p className="text-xs text-slate-400">{supplier.address || "No address"}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No suppliers recorded.</p>}</div></section></div></AdminShell>;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>; }
