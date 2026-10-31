"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { receivePurchase } from "./actions";

export function ReceiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function receive() {
    if (!window.confirm("Receive this purchase and increase stock?")) return;
    setBusy(true);
    const result = await receivePurchase(id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setBusy(false);
  }

  return <button disabled={busy} onClick={receive} className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 disabled:opacity-50">{busy ? "Receiving..." : "Receive stock"}</button>;
}
