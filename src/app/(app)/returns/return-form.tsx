"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { returnSale } from "./actions";

type Item = { product_id: string; name: string; sold: number; returnable: number; unit_price: number };
type Sale = {
  id: string;
  invoice_number: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_method: string;
  payment_status: string;
  amount_paid: number;
  customer_name: string;
  items: Item[];
};

export function ReturnForm({ sales }: { sales: Sale[] }) {
  const [query, setQuery] = useState("");
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const sale = sales.find((entry) => entry.id === saleId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? sales.filter((s) => s.invoice_number.toLowerCase().includes(q)) : sales;
    return list.slice(0, 20);
  }, [query, sales]);

  function chooseSale(id: string) {
    setSaleId(id);
    setQuantities({});
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!sale) return;
    setBusy(true);
    const items = sale.items
      .filter((item) => (quantities[item.product_id] ?? 0) > 0)
      .map((item) => ({ product_id: item.product_id, quantity: quantities[item.product_id] }));
    const result = await returnSale({ saleId, reason, items });
    if (result.ok) {
      toast.success(result.message);
      setSaleId("");
      setReason("");
      setQuantities({});
      setQuery("");
    } else {
      toast.error(result.message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5">
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <p className="eyebrow">Inventory reversal</p>
        <h2 className="mt-2 text-lg font-semibold">Process a customer return</h2>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Search invoice
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type invoice number or last digits"
            className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {matches.length ? (
            matches.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => chooseSale(entry.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${saleId === entry.id ? "border-teal-500 bg-teal-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{entry.invoice_number}</span>
                  <span className="text-slate-600">{formatCurrency(entry.total)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(entry.created_at).toLocaleString("en-PK")} · {entry.customer_name}
                </p>
              </button>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No matching returnable invoices found.</p>
          )}
        </div>
        {query.trim() && sales.length > matches.length ? (
          <p className="mt-2 text-xs text-slate-500">Showing first 20 matches. Type more digits to narrow down.</p>
        ) : null}
      </section>

      {sale ? (
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{sale.invoice_number}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(sale.created_at).toLocaleString("en-PK")} · {sale.customer_name}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{formatCurrency(sale.total)}</p>
              <p className="capitalize">{sale.payment_method.replace("_", " ")} · {sale.payment_status}</p>
              <p className="text-xs">Paid: {formatCurrency(sale.amount_paid)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Sold</th>
                  <th className="pb-2 text-right">Returnable</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Return qty</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.product_id} className="border-t">
                    <td className="py-2 text-slate-700">{item.name}</td>
                    <td className="py-2 text-right text-slate-500">{formatNumber(item.sold)}</td>
                    <td className="py-2 text-right font-medium text-slate-700">{formatNumber(item.returnable)}</td>
                    <td className="py-2 text-right text-slate-500">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={item.returnable}
                        value={quantities[item.product_id] ?? 0}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [item.product_id]: Math.max(0, Math.min(item.returnable, Number(event.target.value) || 0)),
                          }))
                        }
                        className="w-24 rounded-lg border px-2 py-1.5 text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(sale.discount)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(sale.tax)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(sale.total)}</span></div>
          </div>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Reason
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={3}
              placeholder="Damaged, wrong item, etc."
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
            />
          </label>
          <button disabled={busy} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Processing..." : "Process return"}
          </button>
        </section>
      ) : (
        <p className="rounded-3xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          Search and select an invoice to view details and process a return.
        </p>
      )}
    </form>
  );
}
