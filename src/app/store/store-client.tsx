"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, Search, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createOnlineOrder } from "./actions";

type Product = { id: string; name: string; sku: string; selling_price: number; current_stock: number; brand: string | null };

export function StoreClient({ shopId, products }: { shopId: string | null; products: Product[] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const totalItems = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);
  const searchableProducts = useMemo(
    () => products.map((product) => ({
      product,
      searchText: `${product.name} ${product.sku} ${product.brand ?? ""}`.toLowerCase(),
    })),
    [products],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () => searchableProducts
      .filter(({ searchText }) => searchText.includes(normalizedQuery))
      .map(({ product }) => product),
    [normalizedQuery, searchableProducts],
  );

  function change(id: string, amount: number, stock: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(stock, (current[id] ?? 0) + amount));
      const copy = { ...current };
      if (next) copy[id] = next;
      else delete copy[id];
      return copy;
    });
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!shopId || !totalItems) return;
    setBusy(true);
    setMessage("");
    const result = await createOnlineOrder({
      shopId,
      customerName,
      customerPhone,
      customerAddress,
      items: Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity })),
    });
    if (result.ok) {
      setCart({});
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setMessage(`${result.message} Order: ${result.orderNumber}`);
    } else {
      setMessage(result.message);
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mt-8 flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-500 sm:max-w-sm">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full border-0 bg-transparent p-0 text-slate-700 focus:shadow-none" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length ? filtered.map((product) => (
          <article key={product.id} className="group rounded-3xl border bg-white p-3 shadow-sm">
            <div className="flex aspect-square items-end rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-amber-100 p-4"><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{product.brand || "Banday Mart"}</span></div>
            <div className="p-3">
              <h3 className="font-semibold text-slate-900">{product.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{product.current_stock} in stock</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold text-slate-950">{formatCurrency(Number(product.selling_price))}</span>
                {cart[product.id] ? (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                    <button onClick={() => change(product.id, -1, Number(product.current_stock))} className="rounded-lg p-1.5 hover:bg-white" aria-label={`Remove ${product.name}`}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-5 text-center text-sm font-semibold">{cart[product.id]}</span>
                    <button onClick={() => change(product.id, 1, Number(product.current_stock))} className="rounded-lg p-1.5 hover:bg-white" aria-label={`Add ${product.name}`}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => change(product.id, 1, Number(product.current_stock))} className="rounded-xl bg-[#0b1220] p-2.5 text-amber-300 hover:bg-slate-800" aria-label={`Add ${product.name} to cart`}><ShoppingBag className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          </article>
        )) : (
          <div className="col-span-full rounded-3xl border border-dashed bg-white p-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-4 font-semibold">{!shopId ? "Shop link is incomplete" : products.length ? "No products matched your search" : "Your store is being stocked"}</h3>
            <p className="mt-1 text-sm text-slate-500">{!shopId ? "Ask the shop for its official online store link." : products.length ? "Try another product name, brand, or SKU." : "Add active products in the staff dashboard to see them here."}</p>
          </div>
        )}
      </div>
      {totalItems > 0 && (
        <div className="sticky bottom-5 z-10 mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0b1220] px-5 py-4 text-white shadow-2xl">
          <div><span className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-amber-300" />{totalItems} item{totalItems === 1 ? "" : "s"} in your list</span><p className="mt-1 text-xs text-slate-400">Submit your order and the shop will contact you.</p></div>
          {shopId ? <button onClick={() => setCheckoutOpen(true)} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-[#0b1220]">Place order</button> : <span className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Shop link required</span>}
        </div>
      )}
      {message && <p className="mx-auto mt-5 max-w-xl rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">{message}</p>}
      {checkoutOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-5">
          <form onSubmit={submitOrder} className="w-full max-w-lg rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <h2 className="text-xl font-semibold">Place online order</h2>
            <p className="mt-1 text-sm text-slate-500">The shop will confirm availability and contact you.</p>
            <div className="mt-5 space-y-3">
              <input required minLength={2} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border px-3 py-2.5" />
              <input required minLength={5} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number" className="w-full rounded-xl border px-3 py-2.5" />
              <textarea value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Address or pickup note (optional)" className="min-h-24 w-full rounded-xl border px-3 py-2.5" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCheckoutOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
              <button disabled={busy} className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending..." : "Submit order"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
