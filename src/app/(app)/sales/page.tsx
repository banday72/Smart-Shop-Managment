import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { formatCurrency, formatNumber } from "@/lib/utils";

type SaleItemRow = {
  sale_id: string;
  quantity: number;
  unit_price: number;
  line_total: number | null;
  products: { name: string } | { name: string }[] | null;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number | null;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customers: { name: string } | { name: string }[] | null;
};

function asName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) return "Walk-in customer";
  return Array.isArray(value) ? value[0]?.name ?? "Walk-in customer" : value.name;
}

function asProductName(value: SaleItemRow["products"]) {
  if (!value) return "Product";
  return Array.isArray(value) ? value[0]?.name ?? "Product" : value.name;
}

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string }>;
}) {
  await io();
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) redirect("/dashboard");
  const { supabase, shopId } = context;

  const { from, to, q } = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaultFrom.toISOString().slice(0, 10);
  const toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today.toISOString().slice(0, 10);
  const toEnd = `${toDate}T23:59:59.999`;

  let query = supabase
    .from("sales")
    .select("id,invoice_number,subtotal,discount,tax,total,amount_paid,payment_method,payment_status,created_at,customers(name)")
    .eq("shop_id", shopId)
    .gte("created_at", `${fromDate}T00:00:00`)
    .lte("created_at", toEnd)
    .order("created_at", { ascending: false });
  if (q?.trim()) query = query.ilike("invoice_number", `%${q.trim()}%`);
  const { data: sales, error } = await query.limit(200);
  const saleIds = (sales ?? []).map((sale) => sale.id);
  const { data: items } = saleIds.length
    ? await supabase.from("sale_items").select("sale_id,quantity,unit_price,line_total,products(name)").in("sale_id", saleIds)
    : { data: [] as SaleItemRow[] };

  const itemsBySale = new Map<string, SaleItemRow[]>();
  for (const item of (items ?? []) as SaleItemRow[]) {
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push(item);
    itemsBySale.set(item.sale_id, list);
  }

  const rows = (sales ?? []) as SaleRow[];
  const totalRevenue = rows.reduce((sum, sale) => sum + Number(sale.total), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <form className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium text-slate-700">From<input type="date" name="from" defaultValue={fromDate} className="mt-1.5 rounded-xl border px-3 py-2.5 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">To<input type="date" name="to" defaultValue={toDate} className="mt-1.5 rounded-xl border px-3 py-2.5 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Invoice<input type="search" name="q" defaultValue={q ?? ""} placeholder="Search invoice" className="mt-1.5 rounded-xl border px-3 py-2.5 text-sm" /></label>
          <button className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white">Apply</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-xl bg-slate-50 px-3 py-2"><strong className="text-slate-900">{formatNumber(rows.length)}</strong> sales</span>
          <span className="rounded-xl bg-slate-50 px-3 py-2"><strong className="text-slate-900">{formatCurrency(totalRevenue)}</strong> revenue</span>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.message}</p> : rows.length ? (
        <div className="space-y-4">
          {rows.map((sale) => {
            const saleItems = itemsBySale.get(sale.id) ?? [];
            const customerName = asName(sale.customers);
            return (
              <details key={sale.id} className="group rounded-3xl border bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{sale.invoice_number}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(sale.created_at).toLocaleString("en-PK")} • {customerName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{sale.payment_method.replace("_", " ")}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${sale.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : sale.payment_status === "partial" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{sale.payment_status}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(Number(sale.total))}</span>
                  </div>
                </summary>
                <div className="mt-4 border-t pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400"><tr><th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Line total</th></tr></thead>
                      <tbody>
                        {saleItems.map((item, index) => (
                          <tr key={`${sale.id}-${index}`} className="border-t">
                            <td className="py-2 text-slate-700">{asProductName(item.products)}</td>
                            <td className="py-2 text-right text-slate-500">{formatNumber(Number(item.quantity))}</td>
                            <td className="py-2 text-right text-slate-500">{formatCurrency(Number(item.unit_price))}</td>
                            <td className="py-2 text-right font-medium text-slate-800">{formatCurrency(Number(item.line_total ?? Number(item.quantity) * Number(item.unit_price)))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(sale.subtotal))}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(Number(sale.discount))}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(Number(sale.tax))}</span></div>
                    <div className="flex justify-between border-t pt-2 font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(Number(sale.total))}</span></div>
                    <div className="flex justify-between text-xs"><span>Amount paid</span><span>{formatCurrency(Number(sale.amount_paid ?? 0))}</span></div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No POS sales found for this period.</div>
      )}
    </div>
  );
}
