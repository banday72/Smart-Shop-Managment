"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const nextPath = new URLSearchParams(window.location.search).get("next");
    const destination = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
    router.push(destination);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen bg-[#0b1220] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative"><p className="text-sm font-bold tracking-[0.2em] text-amber-300">BANDAY MART</p><h1 className="mt-24 max-w-lg text-6xl font-semibold leading-[1.05] tracking-tight">Run the shop.<br /><span className="text-amber-300">Own the day.</span></h1><p className="mt-6 max-w-md text-lg leading-8 text-slate-400">One calm workspace for sales, stock, customers, and the decisions that keep your business moving.</p></div>
        <div className="relative flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4 text-amber-300" />Secure workspace for your team</div>
      </section>
      <section className="flex items-center justify-center bg-[#f7f8fb] px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><p className="text-sm font-bold tracking-[0.2em] text-amber-700">BANDAY MART</p></div>
          <div className="rounded-3xl border bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1220] text-amber-300"><LockKeyhole className="h-5 w-5" /></div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to your retail workspace.</p>
            </div>
            {!configured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Supabase is not configured. Add your project keys to <code>.env.local</code>.</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Email<input required name="email" type="email" className="mt-1.5 w-full rounded-xl border px-3 py-3" placeholder="you@shop.com" /></label>
              <label className="block text-sm font-medium text-slate-700">Password<input required name="password" type="password" className="mt-1.5 w-full rounded-xl border px-3 py-3" placeholder="Your password" /></label>
              {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1220] py-3.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}{!loading && <ArrowRight className="h-4 w-4 text-amber-300" />}</button>
            </form>
            <div className="mt-6 grid gap-2 text-center text-sm text-slate-500">
              <Link href="/request-access" className="font-semibold text-amber-700 hover:text-amber-800">Need access? Request to join a shop</Link>
              <Link href="/store" className="hover:text-slate-800">Browse the customer store</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Banday Mart · Retail, simplified.</p>
        </div>
      </section>
    </main>
  );
}
