"use client";

import { useState } from "react";
import { receivePurchase } from "./actions";

export function ReceiveButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function receive() { if (!window.confirm("Receive this purchase and increase stock?")) return; setBusy(true); const result = await receivePurchase(id); setMessage(result.message ?? "The purchase could not be received."); setBusy(false); }
  return <span><button disabled={busy} onClick={receive} className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 disabled:opacity-50">{busy ? "Receiving..." : "Receive stock"}</button>{message && <span className="ml-2 text-xs text-slate-500">{message}</span>}</span>;
}
