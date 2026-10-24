import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupplier } from "./actions";

export const instant = false;

export default async function SuppliersPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: suppliers } = await supabase.from("suppliers").select("id,name,phone,email,address").order("name");
  async function submit(formData: FormData) {
    'use server';
    await createSupplier(formData);
  }
  return <main className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="mt-4 text-2xl font-semibold text-slate-900">Suppliers</h1><p className="mt-1 text-sm text-slate-500">Manage supplier contacts for purchasing.</p></header><div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[0.7fr_1.3fr]"><form action={submit} className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Add supplier</h2><div className="mt-5 space-y-4"><Field name="name" label="Supplier name" required /><Field name="phone" label="Phone" /><Field name="email" label="Email" type="email" /><Field name="address" label="Address" /></div><button className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Save supplier</button></form><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Supplier directory</h2><div className="mt-4 divide-y">{suppliers?.length ? suppliers.map((supplier) => <div key={supplier.id} className="py-4"><p className="font-medium text-slate-800">{supplier.name}</p><p className="mt-1 text-sm text-slate-500">{supplier.phone || "No phone"} · {supplier.email || "No email"}</p><p className="text-xs text-slate-400">{supplier.address || "No address"}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No suppliers recorded.</p>}</div></section></div></main>;
}
function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>; }
