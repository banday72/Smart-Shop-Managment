import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { connection } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { StoreClient } from "./store-client";

export const instant = false;

export default async function StorePage() {
  await connection();
  let products: { id: string; name: string; sku: string; selling_price: number; current_stock: number; brand: string | null }[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("id,name,sku,selling_price,current_stock,brand").eq("is_active", true).gt("current_stock", 0).order("name").limit(24);
    products = (data ?? []) as typeof products;
  }

  return <main className="min-h-screen bg-[#0b1220] text-white">
    <header className="border-b border-white/10 px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/store" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 font-black text-[#0b1220]">BM</span><span><strong className="block text-sm tracking-[0.18em]">BANDAY MART</strong><small className="text-xs text-slate-400">Everything you need</small></span></Link><div className="flex items-center gap-3"><Link href="/dashboard" className="hidden text-sm text-slate-300 hover:text-white sm:block">Staff login</Link><Link href="#shop" className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-[#0b1220]">Shop now</Link></div></div></header>
    <section className="relative overflow-hidden px-5 py-16 sm:px-10 sm:py-24"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" /><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]"><div><p className="eyebrow text-amber-300">Your neighbourhood, upgraded</p><h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">Simple shopping.<br /><span className="text-amber-300">Better stocked.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Quality everyday essentials, thoughtfully organised and ready when you need them.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="#shop" className="flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3.5 font-bold text-[#0b1220]">Explore products <ArrowRight className="h-4 w-4" /></Link><span className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-sm text-slate-300"><Truck className="h-4 w-4 text-amber-300" />Fast local delivery</span></div></div><div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20"><div className="rounded-[1.5rem] bg-gradient-to-br from-amber-300 to-orange-400 p-8 text-[#0b1220]"><Sparkles className="h-8 w-8" /><p className="mt-16 text-sm font-bold uppercase tracking-[0.2em]">The Banday promise</p><p className="mt-2 text-3xl font-semibold leading-tight">Fair prices.<br />Fresh stock.</p></div><div className="grid grid-cols-2 gap-3 p-4 text-sm text-slate-300"><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" />Trusted quality</p><p className="flex items-center gap-2"><Truck className="h-4 w-4 text-amber-300" />Local delivery</p></div></div></div></section>
    <section id="shop" className="bg-[#f7f8fb] px-5 py-14 text-slate-950 sm:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">The essentials</p><h2 className="mt-2 text-3xl font-semibold">Shop our collection</h2><p className="mt-2 text-slate-500">Fresh stock, clear prices, no fuss.</p></div><p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">In-store pickup · Pay at the counter</p></div><StoreClient products={products} /></div></section>
    <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-slate-400 sm:px-10">© {new Date().getFullYear()} Banday Mart · Retail, simplified.</footer>
  </main>;
}
