"use client";

import { useState } from "react";
import { toast } from "sonner";
import { returnSale } from "./actions";

type Item = { product_id: string; name: string; quantity: number; unit_price: number };
type Sale = { id: string; invoice_number: string; created_at: string; items: Item[] };

export function ReturnForm({ sales }: { sales: Sale[] }) {
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const sale = sales.find((entry) => entry.id === saleId);

  function chooseSale(value: string) {
    setSaleId(value);
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
    } else toast.error(result.message);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="max-w-2xl rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <p className="eyebrow">Inventory reversal</p>
      <h2 className="mt-2 text-lg font-semibold">Process a customer return</h2>
      <label className="mt-5 block text-sm font-medium text-slate-700">Sale
        <select value={saleId} onChange={(event) => chooseSale(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5">
          <option value="">Select an invoice</option>
          {sales.map((entry) => <option key={entry.id} value={entry.id}>{entry.invoice_number} · {new Date(entry.created_at).toLocaleDateString("en-PK")}</option>)}
        </select>
      </label>
      {sale && <div className="mt-5 space-y-3">{sale.items.map((item) => <label key={item.product_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm"><span>{item.name}<span className="ml-2 text-xs text-slate-400">sold {item.quantity}</span></span><input type="number" min="0" max={item.quantity} value={quantities[item.product_id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.product_id]: Math.max(0, Math.min(item.quantity, Number(event.target.value))) }))} className="w-24 rounded-lg border px-2 py-1.5 text-right" /></label>)}</div>}
      <label className="mt-5 block text-sm font-medium text-slate-700">Reason
        <input value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} placeholder="Damaged, wrong item, etc." className="mt-1.5 w-full rounded-xl border px-3 py-2.5" />
      </label>
      <button disabled={!sale || busy} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Processing..." : "Process return"}</button>
    </form>
  );
}
