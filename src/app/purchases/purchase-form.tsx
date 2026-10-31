"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPurchaseWithItems } from "./actions";

type Option = { id: string; name: string };

export function PurchaseForm({ products, suppliers }: { products: Option[]; suppliers: Option[] }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    const result = await createPurchaseWithItems(formData);
    const message = result.message ?? "The purchase could not be saved.";
    setMessage(message);
    if (result.ok) {
      toast.success(message);
      ref.current?.reset();
      router.refresh();
    } else {
      toast.error(message);
    }
    setBusy(false);
  }

  return (
    <form ref={ref} action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <p className="eyebrow">Inventory inbound</p>
      <h2 className="mt-2 text-lg font-semibold">Create purchase order</h2>
      <p className="mt-1 text-sm text-slate-500">Stock increases only after you press Receive stock on the order.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field name="invoiceNumber" label="Invoice number" />
        <Field name="purchasedAt" label="Purchase date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} />
        <label className="text-sm font-medium text-slate-700">Supplier<select name="supplierId" className="mt-1.5 w-full rounded-xl border px-3 py-2.5"><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Product<select required name="productId" className="mt-1.5 w-full rounded-xl border px-3 py-2.5"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <Field name="quantity" label="Quantity" type="number" defaultValue="1" />
        <Field name="unitCost" label="Unit cost (PKR)" type="number" defaultValue="0" />
      </div>
      {message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      <button disabled={busy} className="mt-5 rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Create purchase"}</button>
    </form>
  );
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) {
  return <label className="text-sm font-medium text-slate-700">{label}<input name={name} type={type} defaultValue={defaultValue} required={name === "quantity" || name === "unitCost"} min={type === "number" ? "0" : undefined} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>;
}
