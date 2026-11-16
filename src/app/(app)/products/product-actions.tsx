"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { adjustProductStock, deleteProduct } from "./actions";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  async function archive() {
    if (!window.confirm("Archive this product? It will no longer appear in active stock.")) return;
    setBusy(true);
    const result = await deleteProduct(productId);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    setBusy(false);
  }
  return <button disabled={busy} onClick={archive} className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">{busy ? "Archiving..." : "Archive"}</button>;
}

export function AdjustStockButton({ productId, productName, currentStock }: { productId: string; productName: string; currentStock: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await adjustProductStock(formData);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
        <PackagePlus className="h-3.5 w-3.5" />Stock
      </button>
    );
  }

  return (
    <form action={submit} className="mt-2 w-full min-w-[220px] space-y-2 rounded-xl border bg-slate-50 p-3 text-left">
      <input type="hidden" name="productId" value={productId} />
      <p className="text-xs font-medium text-slate-700">Adjust stock: {productName}</p>
      <p className="text-[11px] text-slate-500">Current: {currentStock}. Use + to add, - to reduce.</p>
      <label className="block text-xs text-slate-600">Change (+/-)
        <input name="quantity" type="number" step="1" required className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" placeholder="e.g. 10 or -2" />
      </label>
      <label className="block text-xs text-slate-600">Reason
        <input name="reason" type="text" required minLength={3} maxLength={200} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" placeholder="e.g. Stock count correction" />
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button disabled={busy} className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Update"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
      </div>
    </form>
  );
}
