"use client";

import { useRef, useState } from "react";
import { saveProduct } from "./actions";

export function ProductForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const result = await saveProduct(formData);
    setMessage(result.message);
    if (result.ok) formRef.current?.reset();
    setSaving(false);
  }

  return (
    <form ref={formRef} action={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Add product</h2>
      <p className="mt-1 text-sm text-slate-500">Every SKU is unique within your shop.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Product name" required />
        <Field name="sku" label="SKU" required />
        <Field name="barcode" label="Barcode" />
        <Field name="brand" label="Brand" />
        <Field name="purchasePrice" label="Purchase price (PKR)" type="number" min="0" step="0.01" required />
        <Field name="sellingPrice" label="Selling price (PKR)" type="number" min="0" step="0.01" required />
        <Field name="currentStock" label="Opening stock (optional)" type="number" min="0" defaultValue="0" />
        <Field name="minimumStock" label="Minimum stock alert" type="number" min="0" required />
      </div>
      {message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      <button disabled={saving} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? "Saving..." : "Save product"}</button>
    </form>
  );
}

function Field({ name, label, type = "text", required, min, step, defaultValue }: { name: string; label: string; type?: string; required?: boolean; min?: string; step?: string; defaultValue?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} min={min} step={step} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>;
}
