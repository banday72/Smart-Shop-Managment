"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteProduct } from "./actions";

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
