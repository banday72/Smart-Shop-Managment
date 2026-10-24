import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ExpenseForm } from "./expense-form";

export default async function ExpensesPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: expenses } = await supabase.from("expenses").select("id,category,amount,expense_date,payment_method,description").order("expense_date", { ascending: false }).limit(50);
  return <main className="min-h-screen bg-[#f6f8fb]"><header className="border-b bg-white px-5 py-5 sm:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link><h1 className="mt-4 text-2xl font-semibold text-slate-900">Expenses</h1><p className="mt-1 text-sm text-slate-500">Track operating expenses separately from COGS and revenue.</p></header><div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]"><ExpenseForm /><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Recent expenses</h2><div className="mt-4 divide-y">{expenses?.length ? expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium text-slate-800">{expense.category}</p><p className="text-xs text-slate-400">{expense.expense_date} · {expense.payment_method}</p></div><p className="font-semibold text-slate-900">PKR {Number(expense.amount).toLocaleString("en-PK")}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No expenses recorded.</p>}</div></section></div></main>;
}
