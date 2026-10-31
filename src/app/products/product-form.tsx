"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { saveProduct } from "./actions";

type Option = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  brand: string | null;
  category_id: string | null;
  supplier_id: string | null;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  current_stock: number;
};

export function ProductForm({
  initial,
  categories,
  suppliers,
}: {
  initial?: Product | null;
  categories: Option[];
  suppliers: Option[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const result = await saveProduct(formData);
    setMessage(result.message);
    if (result.ok) {
      toast.success(result.message);
      if (editing) router.push("/products");
      else formRef.current?.reset();
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setSaving(false);
  }

  return (
    <form ref={formRef} action={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{editing ? "Edit product" : "Add product"}</h2>
          <p className="mt-1 text-sm text-slate-500">{editing ? "Update catalog details. Stock changes stay auditable through purchases and adjustments." : "Every SKU is unique within your shop."}</p>
        </div>
        {editing && <Link href="/products" className="rounded-xl border px-3 py-2 text-sm font-semibold text-slate-600">Cancel</Link>}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Product name" required defaultValue={initial?.name} />
        <Field name="sku" label="SKU" required defaultValue={initial?.sku} />
        <Field name="barcode" label="Barcode" defaultValue={initial?.barcode ?? undefined} />
        <Field name="brand" label="Brand" defaultValue={initial?.brand ?? undefined} />
        <SelectField name="categoryId" label="Category" options={categories} defaultValue={initial?.category_id ?? undefined} emptyLabel="No category" />
        <SelectField name="supplierId" label="Supplier" options={suppliers} defaultValue={initial?.supplier_id ?? undefined} emptyLabel="No supplier" />
        <Field name="purchasePrice" label="Purchase price (PKR)" type="number" min="0" step="0.01" required defaultValue={initial ? String(initial.purchase_price) : undefined} />
        <Field name="sellingPrice" label="Selling price (PKR)" type="number" min="0" step="0.01" required defaultValue={initial ? String(initial.selling_price) : undefined} />
        {editing ? (
          <label className="block text-sm font-medium text-slate-700">Current stock<input value={`${initial?.current_stock ?? 0} units`} readOnly className="mt-1.5 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></label>
        ) : (
          <Field name="currentStock" label="Opening stock (optional)" type="number" min="0" defaultValue="0" />
        )}
        <Field name="minimumStock" label="Minimum stock alert" type="number" min="0" required defaultValue={initial ? String(initial.minimum_stock) : undefined} />
      </div>
      {message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      <button disabled={saving} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? "Saving..." : editing ? "Save changes" : "Save product"}</button>
    </form>
  );
}

function Field({ name, label, type = "text", required, min, step, defaultValue }: { name: string; label: string; type?: string; required?: boolean; min?: string; step?: string; defaultValue?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} min={min} step={step} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>;
}

function SelectField({ name, label, options, defaultValue, emptyLabel }: { name: string; label: string; options: Option[]; defaultValue?: string; emptyLabel: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">{label}
      <select name={name} defaultValue={defaultValue ?? ""} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}
