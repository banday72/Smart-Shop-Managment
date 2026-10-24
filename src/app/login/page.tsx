"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    if (signInError) setError(signInError.message);
    else router.push("/dashboard");
    setLoading(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><div className="mb-8 flex items-center gap-3"><Image src="/shop-management-logo.png" alt="Shop Management" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" /><div><h1 className="font-semibold text-slate-900">Welcome back</h1><p className="text-sm text-slate-500">Sign in to Banday Mart</p></div></div><form onSubmit={handleSubmit} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Email<input required name="email" type="email" className="mt-1.5 w-full rounded-xl border px-3 py-2.5" placeholder="you@shop.com" /></label><label className="block text-sm font-medium text-slate-700">Password<input required name="password" type="password" className="mt-1.5 w-full rounded-xl border px-3 py-2.5" placeholder="••••••••" /></label>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form></div></main>;
}
