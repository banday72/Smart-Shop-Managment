import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Boxes, CircleDollarSign, Contact, PackageSearch, Settings, ShoppingCart, Truck, Users } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createCategory, updateProfileRole } from "./actions";

export const instant = false;

const modules = [
  { href: "/products", label: "Products", detail: "Catalog, prices, stock", icon: PackageSearch },
  { href: "/pos", label: "Point of Sale", detail: "Sales and payments", icon: ShoppingCart },
  { href: "/purchases", label: "Purchases", detail: "Suppliers and receiving", icon: Truck },
  { href: "/customers", label: "Customers", detail: "Profiles and credit limits", icon: Contact },
  { href: "/suppliers", label: "Suppliers", detail: "Supplier directory", icon: Users },
  { href: "/expenses", label: "Expenses", detail: "Operating costs", icon: CircleDollarSign },
  { href: "/reports", label: "Reports", detail: "Sales and profit", icon: CircleDollarSign },
  { href: "/settings", label: "Shop settings", detail: "Identity and locale", icon: Settings },
];

export default async function AdminPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("shop_id, role, full_name").eq("id", auth.user.id).single();
  if (!profile || !["owner", "manager"].includes(profile.role)) redirect("/dashboard");

  const [{ data: shop }, { data: categories }, { data: profiles }] = await Promise.all([
    supabase.from("shops").select("name,address,phone,currency").eq("id", profile.shop_id).single(),
    supabase.from("categories").select("id,name").eq("shop_id", profile.shop_id).order("name"),
    supabase.from("profiles").select("id,full_name,role").eq("shop_id", profile.shop_id).order("full_name"),
  ]);
  async function submitCategory(formData: FormData) {
    "use server";
    await createCategory(formData);
  }
  async function submitRole(formData: FormData) {
    "use server";
    await updateProfileRole(formData);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <header className="border-b bg-white px-5 py-5 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold text-slate-900">Admin control center</h1><p className="mt-1 text-sm text-slate-500">Manage {shop?.name ?? "your shop"} and access every operational module.</p></div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold capitalize text-teal-700">{profile.role} access</span>
        </div>
      </header>
      <div className="space-y-6 p-5 sm:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200"><span className="inline-flex rounded-xl bg-teal-50 p-2 text-teal-600"><Icon className="h-5 w-5" /></span><p className="mt-4 font-semibold text-slate-800">{label}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Link>)}
        </section>
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-teal-600" /><div><h2 className="font-semibold text-slate-900">Categories</h2><p className="text-sm text-slate-500">Add categories for the product catalog.</p></div></div>
            <form action={submitCategory} className="mt-4 flex gap-2"><input name="name" required minLength={2} placeholder="e.g. Grocery" className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Add</button></form>
            <div className="mt-4 flex flex-wrap gap-2">{categories?.length ? categories.map((category) => <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{category.name}</span>) : <p className="text-sm text-slate-500">No categories yet.</p>}</div>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><Users className="h-5 w-5 text-teal-600" /><div><h2 className="font-semibold text-slate-900">Team access</h2><p className="text-sm text-slate-500">Owners can change roles for linked users.</p></div></div>
            <div className="mt-4 space-y-3">{profiles?.map((member) => <form key={member.id} action={submitRole} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input type="hidden" name="profileId" value={member.id} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{member.full_name || "Unnamed user"}</p><p className="text-xs text-slate-500">{member.id === auth.user.id ? "You" : "Linked account"}</p></div>{profile.role === "owner" ? <><select name="role" defaultValue={member.role} className="rounded-lg border bg-white px-2 py-1.5 text-sm"><option value="owner">Owner</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select><button className="text-sm font-semibold text-teal-700">Save</button></> : <span className="text-sm capitalize text-slate-600">{member.role}</span>}</form>)}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
