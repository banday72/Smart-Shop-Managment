import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ExpenseForm } from "./expense-form";
import { AppShell } from "@/components/app-shell";

export const instant = false;

export default async function ExpensesPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) redirect("/login");
  const { data: expenses } = await supabase.from("expenses").select("id,category,amount,expense_date,payment_method,description").order("expense_date", { ascending: false }).limit(50);
  return <AppShell title="Expenses" description="Track operating expenses separately from COGS and revenue."><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><ExpenseForm /><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">Ledger</p><h2 className="mt-2 text-lg font-semibold">Recent expenses</h2><div className="mt-4 divide-y">{expenses?.length ? expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold text-slate-800">{expense.category}</p><p className="text-xs text-slate-400">{expense.expense_date} · {expense.payment_method}</p></div><p className="font-semibold text-slate-900">PKR {Number(expense.amount).toLocaleString("en-PK")}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No expenses recorded.</p>}</div></section></div></AppShell>;
}
