"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Printer, ReceiptText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { completeSale } from "./actions";
import { formatCurrency } from "@/lib/utils";

type Product = { id: string; name: string; sku: string; barcode: string | null; selling_price: number; current_stock: number };
type CartItem = Product & { quantity: number };
type Receipt = {
  invoiceNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
};

export function PosClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const matches = products
    .filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0), [cart]);
  const total = Math.max(0, subtotal - discount + tax);

  function add(product: Product) {
    const stock = Number(product.current_stock);
    if (stock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          setMessage(`Only ${product.current_stock} units of ${product.name} available.`);
          return current;
        }
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setMessage("");
    setQuery("");
  }

  function changeQuantity(id: string, amount: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = Math.max(0, Math.min(Number(item.current_stock), item.quantity + amount));
        return { ...item, quantity: next };
      }).filter((item) => item.quantity > 0),
    );
  }

  async function checkout() {
    if (!cart.length) return;
    if (discount > subtotal) {
      setMessage("Discount cannot be more than the subtotal.");
      return;
    }
    setBusy(true);
    setMessage("");
    const invoiceNumber = `INV-${Date.now()}`;
    const result = await completeSale({
      invoiceNumber,
      discount,
      tax,
      paymentMethod,
      paymentStatus,
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    });
    if (!result.ok) {
      setMessage(result.message ?? "The sale could not be completed.");
      toast.error(result.message ?? "The sale could not be completed.");
      setBusy(false);
      return;
    }
    setReceipt({
      invoiceNumber,
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({ ...item })),
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
    });
    setCart([]);
    setDiscount(0);
    setTax(0);
    setMessage("Sale completed. Stock has been updated.");
    toast.success("Sale completed");
    setBusy(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU or barcode" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm" />
          {query && (
            <div className="absolute z-10 mt-2 w-full rounded-xl border bg-white p-2 shadow-lg">
              {matches.length ? matches.map((product) => (
                <button key={product.id} onClick={() => add(product)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                  <span><span className="block text-sm font-medium text-slate-800">{product.name}</span><span className="text-xs text-slate-400">{product.sku} · {product.current_stock} available</span></span>
                  <span className="text-sm font-semibold">{formatCurrency(Number(product.selling_price))}</span>
                </button>
              )) : <p className="px-3 py-4 text-sm text-slate-500">No products matched your search.</p>}
            </div>
          )}
        </div>
        <div className="mt-6">
          <h2 className="font-semibold text-slate-900">Cart</h2>
          {cart.length ? (
            <div className="mt-4 divide-y">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-4">
                  <div><p className="font-medium text-slate-800">{item.name}</p><p className="text-xs text-slate-400">{formatCurrency(Number(item.selling_price))} each · {item.current_stock} in stock</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQuantity(item.id, -1)} className="rounded-lg border p-1" aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)} className="rounded-lg border p-1" aria-label={`Add one ${item.name}`}><Plus className="h-4 w-4" /></button>
                    <button onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="ml-2 text-rose-500" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-10 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Search products to start a sale.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Checkout</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <label className="flex items-center justify-between gap-4"><span className="text-slate-500">Discount</span><input type="number" min="0" value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} className="w-28 rounded-lg border px-2 py-1.5 text-right" /></label>
            <label className="flex items-center justify-between gap-4"><span className="text-slate-500">Tax</span><input type="number" min="0" value={tax} onChange={(event) => setTax(Math.max(0, Number(event.target.value)))} className="w-28 rounded-lg border px-2 py-1.5 text-right" /></label>
            <div className="flex justify-between border-t pt-3 text-lg font-semibold text-slate-900"><span>Grand total</span><span>{formatCurrency(total)}</span></div>
            <label className="block pt-3 text-slate-500">Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-slate-800"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="credit">Credit</option><option value="other">Other</option></select></label>
            <label className="block text-slate-500">Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-slate-800"><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option></select></label>
          </div>
          {message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
          <button disabled={!cart.length || busy} onClick={checkout} className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Processing..." : "Complete sale"}</button>
        </div>

        {receipt && (
          <div className="receipt rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">Receipt</p><h2 className="mt-1 text-lg font-semibold">Sale completed</h2><p className="text-xs text-slate-500">{receipt.invoiceNumber} · {new Date(receipt.createdAt).toLocaleString("en-PK")}</p></div>
              <button onClick={() => window.print()} className="rounded-xl border p-2.5 text-slate-600" aria-label="Print receipt"><Printer className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2 border-y py-3 text-sm">
              {receipt.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.quantity} × {item.name}</span><span className="font-medium">{formatCurrency(Number(item.selling_price) * item.quantity)}</span></div>)}
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(receipt.discount)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(receipt.tax)}</span></div>
              <div className="flex justify-between pt-2 text-base font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(receipt.total)}</span></div>
              <p className="pt-2 text-xs capitalize">Paid by {receipt.paymentMethod.replace("_", " ")}</p>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><ReceiptText className="h-3.5 w-3.5" />Thank you for shopping at Banday Mart.</p>
          </div>
        )}
      </section>
    </div>
  );
}
