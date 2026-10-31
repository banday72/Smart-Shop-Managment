"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { requestShopAccess } from "./actions";

export default function RequestAccessPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const result = await requestShopAccess(new FormData(event.currentTarget));
    setMessage(result.message ?? "");
    setSending(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
        <form onSubmit={submit} className="rounded-3xl border bg-white p-7 shadow-xl">
          <p className="eyebrow">Banday Mart</p>
          <h1 className="mt-2 text-2xl font-semibold">Request shop access</h1>
          <p className="mt-2 text-sm text-slate-500">Ask the shop owner for their shop ID, then send this request. An owner or manager will approve it.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Your name<input required name="fullName" className="mt-1.5 w-full rounded-xl border px-3 py-3" /></label>
            <label className="block text-sm font-medium">Shop ID<input required name="shopId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-1.5 w-full rounded-xl border px-3 py-3" /></label>
          </div>
          {message && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{message}</p>}
          <button disabled={sending} className="mt-5 w-full rounded-xl bg-[#0b1220] py-3 font-semibold text-white disabled:opacity-60">{sending ? "Sending..." : "Send request"}</button>
        </form>
      </div>
    </main>
  );
}
