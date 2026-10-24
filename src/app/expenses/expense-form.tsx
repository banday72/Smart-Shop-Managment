"use client";

import { useRef, useState } from "react";
import { createExpense } from "./actions";

export function ExpenseForm() {
  const ref = useRef<HTMLFormElement>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(data: FormData) { setBusy(true); const result = await createExpense(data); setMessage(result.message ?? "The expense could not be saved."); if (result.ok) ref.current?.reset(); setBusy(false); }
  return <form ref={ref} action={submit} className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Record expense</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field name="category" label="Category" /><Field name="amount" label="Amount (PKR)" type="number" /><Field name="expenseDate" label="Date" type="date" /><label className="text-sm font-medium text-slate-700">Payment method<select name="paymentMethod" defaultValue="cash" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" className="mt-1.5 min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm" /></label></div>{message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}<button disabled={busy} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save expense"}</button></form>;
}
function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) { return <label className="text-sm font-medium text-slate-700">{label}<input required name={name} type={type} defaultValue={type === "date" ? new Date().toISOString().slice(0, 10) : undefined} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>; }
