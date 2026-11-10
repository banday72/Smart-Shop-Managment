"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createShop } from "../../shop-actions";

export function CreateShopForm({ defaultName, defaultFullName }: { defaultName: string; defaultFullName: string }) {
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await createShop(formData);
    if (!result.ok) {
      toast.error(result.message);
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Shop name" defaultValue={defaultName} required />
        <Field name="currency" label="Currency" defaultValue="PKR" required />
        <Field name="fullName" label="Owner name" defaultValue={defaultFullName} />
        <Field name="phone" label="Phone" />
        <Field name="address" label="Address" className="sm:col-span-2" />
      </div>
      <button disabled={busy} className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Creating..." : "Create shop"}
      </button>
    </form>
  );
}

function Field({ name, label, defaultValue, required, className = "" }: { name: string; label: string; defaultValue?: string; required?: boolean; className?: string }) {
  return <label className={`block text-sm font-medium text-slate-700 ${className}`}>{label}<input name={name} defaultValue={defaultValue} required={required} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>;
}
