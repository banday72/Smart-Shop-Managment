"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { completeSale } from "./actions";
import { formatCurrency } from "@/lib/utils";

type Product = { id: string; name: string; sku: string; barcode: string | null; selling_price: number; current_stock: number };
type CartItem = Product & { quantity: number };

export function PosClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = products.filter((p) => `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0), [cart]);
  const total = Math.max(0, subtotal - discount + tax);

  function add(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.current_stock) } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setQuery("");
  }

  async function checkout() {
    setBusy(true); setMessage("");
    const result = await completeSale({
      invoiceNumber: `INV-${Date.now()}`,
      subtotal, discount, tax, paymentMethod, paymentStatus,
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity, unit_price: Number(item.selling_price) })),
    });
    setMessage(result.message ?? "The sale could not be completed.");
    if (result.ok) setCart([]);
    setBusy(false);
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or barcode" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm" />{query && <div className="absolute z-10 mt-2 w-full rounded-xl border bg-white p-2 shadow-lg">{matches.map((product) => <button key={product.id} onClick={() => add(product)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"><span><span className="block text-sm font-medium text-slate-800">{product.name}</span><span className="text-xs text-slate-400">{product.sku} · {product.current_stock} available</span></span><span className="text-sm font-semibold">{formatCurrency(Number(product.selling_price))}</span></button>)}</div>}</div><div className="mt-6"><h2 className="font-semibold text-slate-900">Cart</h2>{cart.length ? <div className="mt-4 divide-y">{cart.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-medium text-slate-800">{item.name}</p><p className="text-xs text-slate-400">{formatCurrency(Number(item.selling_price))} each</p></div><div className="flex items-center gap-2"><button onClick={() => setCart((c) => c.map((i) => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="rounded-lg border p-1"><Minus className="h-4 w-4" /></button><span className="w-6 text-center text-sm">{item.quantity}</span><button onClick={() => setCart((c) => c.map((i) => i.id === item.id ? { ...i, quantity: Math.min(item.current_stock, i.quantity + 1) } : i))} className="rounded-lg border p-1"><Plus className="h-4 w-4" /></button><button onClick={() => setCart((c) => c.filter((i) => i.id !== item.id))} className="ml-2 text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <p className="mt-10 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Search products to start a sale.</p>}</div></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Checkout</h2><div className="mt-5 space-y-3 text-sm"><Row label="Subtotal" value={formatCurrency(subtotal)} /><label className="flex items-center justify-between gap-4"><span className="text-slate-500">Discount</span><input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-28 rounded-lg border px-2 py-1.5 text-right" /></label><label className="flex items-center justify-between gap-4"><span className="text-slate-500">Tax</span><input type="number" min="0" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-28 rounded-lg border px-2 py-1.5 text-right" /></label><div className="border-t pt-3"><Row label="Grand total" value={formatCurrency(total)} strong /></div><label className="block pt-3 text-slate-500">Payment method<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-slate-800"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="credit">Credit</option><option value="other">Other</option></select></label><label className="block text-slate-500">Payment status<select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-slate-800"><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option></select></label></div>{message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}<div className="mt-5 flex gap-3"><button disabled={!cart.length || busy} onClick={checkout} className="flex-1 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Processing..." : "Complete sale"}</button><button onClick={() => window.print()} className="rounded-xl border px-4 py-3 text-slate-600"><Printer className="h-5 w-5" /></button></div></section></div>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "text-lg font-semibold text-slate-900" : "text-slate-500"}`}><span>{label}</span><span>{value}</span></div>;
}
