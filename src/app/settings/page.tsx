import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("shop_id,role").eq("id", user.user.id).single();
  if (profile?.role !== "owner") redirect("/dashboard");
  const { data: shop } = await supabase.from("shops").select("name,address,phone,currency").eq("id", profile.shop_id).single();
  const { data: settings } = await supabase.from("shop_settings").select("locale").eq("shop_id", profile.shop_id).maybeSingle();
  return <main className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="mt-4 text-2xl font-semibold text-slate-900">Shop settings</h1><p className="mt-1 text-sm text-slate-500">Configure shop identity, currency, and language.</p></header><form action={async (formData: FormData) => { await saveSettings(formData); }} className="m-5 max-w-2xl space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:m-8"><Field name="name" label="Shop name" value={shop?.name} required /><Field name="address" label="Address" value={shop?.address ?? undefined} /><Field name="phone" label="Phone" value={shop?.phone ?? undefined} /><Field name="currency" label="Currency code" value={shop?.currency ?? "PKR"} required /><label className="block text-sm font-medium text-slate-700">Language<select name="locale" defaultValue={settings?.locale ?? "en"} className="mt-1.5 w-full rounded-xl border px-3 py-2.5"><option value="en">English</option><option value="ur">اردو</option></select></label><button className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Save settings</button></form></main>;
}
function Field({ name, label, value, required }: { name: string; label: string; value?: string; required?: boolean }) { return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} defaultValue={value} required={required} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>; }
