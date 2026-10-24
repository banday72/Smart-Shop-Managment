"use client";

import { useState } from "react";
import { deleteProduct } from "./actions";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  async function archive() {
    if (!window.confirm("Archive this product? It will no longer appear in active stock.")) return;
    setBusy(true);
    await deleteProduct(productId);
    setBusy(false);
  }
  return <button disabled={busy} onClick={archive} className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">{busy ? "Archiving..." : "Archive"}</button>;
}
