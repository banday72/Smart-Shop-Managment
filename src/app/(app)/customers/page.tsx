import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { createCustomer, recordCustomerPayment } from "./actions";

export default async function CustomersPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("/login");
  const { supabase } = context;
  const [{ data: customers }, { data: customerSales }, { data: customerPayments }] = await Promise.all([
    supabase.from("customers").select("id,name,phone,email,credit_limit").order("name"),
    supabase.from("sales").select("customer_id,total").not("customer_id", "is", null),
    supabase.from("payments").select("customer_id,amount").not("customer_id", "is", null),
  ]);
  const balances = new Map<string, number>();
  for (const sale of customerSales ?? []) balances.set(sale.customer_id, (balances.get(sale.customer_id) ?? 0) + Number(sale.total));
  for (const payment of customerPayments ?? []) balances.set(payment.customer_id, (balances.get(payment.customer_id) ?? 0) - Number(payment.amount));
  async function submit(formData: FormData) { "use server"; await createCustomer(formData); }
  async function submitPayment(formData: FormData) { "use server"; await recordCustomerPayment(formData); }
  return <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">New record</p><h2 className="mt-2 text-lg font-semibold">Add customer</h2><div className="mt-5 space-y-4"><Field name="name" label="Customer name" required /><Field name="phone" label="Phone" /><Field name="email" label="Email" type="email" /><Field name="creditLimit" label="Credit limit (PKR)" type="number" /></div><button className="mt-5 w-full rounded-xl bg-[#0b1220] px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save customer</button></form><section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><p className="eyebrow">Directory</p><h2 className="mt-2 text-lg font-semibold">Customer balances</h2><div className="mt-4 divide-y">{customers?.length ? customers.map((customer) => { const balance = balances.get(customer.id) ?? 0; return <div key={customer.id} className="py-4"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold text-slate-800">{customer.name}</p><p className="text-sm text-slate-500">{customer.phone || "No phone"} · limit PKR {Number(customer.credit_limit).toLocaleString("en-PK")}</p></div><p className={`text-right text-sm font-semibold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{balance > 0 ? "Due" : "Credit"}<br />PKR {Math.abs(balance).toLocaleString("en-PK")}</p></div>{balance > 0 && <form action={submitPayment} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="customerId" value={customer.id} /><input name="amount" type="number" min="0.01" max={balance} step="0.01" placeholder="Payment amount" required className="min-w-32 flex-1 rounded-lg border px-3 py-2 text-sm" /><select name="method" defaultValue="cash" className="rounded-lg border px-3 py-2 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select><button className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">Record payment</button></form>}</div>; }) : <p className="py-8 text-center text-sm text-slate-500">No customers recorded.</p>}</div></section></div>;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} min={type === "number" ? "0" : undefined} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>; }
