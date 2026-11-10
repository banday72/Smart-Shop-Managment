"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelOrder, confirmOrder, fulfillOrder } from "./actions";

export function OrderActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);

  async function run(action: (orderId: string) => Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    const result = await action(id);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending" && <>
        <button disabled={busy} onClick={() => void run(confirmOrder)} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm</button>
        <button disabled={busy} onClick={() => void run(cancelOrder)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50">Cancel</button>
      </>}
      {status === "confirmed" && <button disabled={busy} onClick={() => void run(fulfillOrder)} className="rounded-lg bg-[#0b1220] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Mark fulfilled</button>}
    </div>
  );
}
