import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createCustomer } from "./actions";

export const instant = false;

export default async function CustomersPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: customers } = await supabase.from("customers").select("id,name,phone,email,credit_limit").order("name");
  async function submit(formData: FormData) { "use server"; await createCustomer(formData); }
  return <AdminShell title="Customers" description="Build stronger relationships with every sale."><div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">New record</p><h2 className="mt-2 text-lg font-semibold">Add customer</h2><div className="mt-5 space-y-4"><Field name="name" label="Customer name" required /><Field name="phone" label="Phone" /><Field name="email" label="Email" type="email" /><Field name="creditLimit" label="Credit limit (PKR)" type="number" /></div><button className="mt-5 w-full rounded-xl bg-[#0b1220] px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save customer</button></form><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">Directory</p><h2 className="mt-2 text-lg font-semibold">Customer list</h2><div className="mt-4 divide-y">{customers?.length ? customers.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold text-slate-800">{customer.name}</p><p className="text-sm text-slate-500">{customer.phone || "No phone"} · {customer.email || "No email"}</p></div><p className="text-right text-sm text-slate-500">Credit<br /><strong className="text-slate-800">PKR {Number(customer.credit_limit).toLocaleString("en-PK")}</strong></p></div>) : <p className="py-8 text-center text-sm text-slate-500">No customers recorded.</p>}</div></section></div></AdminShell>;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} min={type === "number" ? "0" : undefined} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>; }
