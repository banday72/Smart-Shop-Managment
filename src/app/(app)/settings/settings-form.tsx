"use client";

import { FormEvent, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteShop } from "../shop-actions";
import { saveSettings } from "./actions";

export function SettingsForm({
  shopId,
  canEditShop,
  shop,
  locale,
}: {
  shopId: string;
  canEditShop: boolean;
  shop: { name: string; address: string; phone: string; currency: string };
  locale: string;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const result = await saveSettings(formData);
    const msg = result.message ?? "Your settings could not be saved.";
    setMessage(msg);
    if (result.ok) toast.success(msg);
    else toast.error(msg);
    setSaving(false);
  }

  async function copyShopId() {
    try {
      await navigator.clipboard.writeText(shopId);
      setCopied(true);
      toast.success("Shop ID copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the Shop ID. Please copy it manually.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form action={submit} className="space-y-5 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Shop ID</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{shopId}</code>
            <button type="button" onClick={copyShopId} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1220] px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-800">Share this ID with team members so they can request access.</p>
        </div>
        {canEditShop ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Shop name" defaultValue={shop.name} required />
              <Field name="currency" label="Currency code" defaultValue={shop.currency} required />
              <Field name="phone" label="Phone" defaultValue={shop.phone} />
              <Field name="address" label="Address" defaultValue={shop.address} />
            </div>
            <label className="block text-sm font-medium text-slate-700">Language
              <select name="locale" defaultValue={locale} className="mt-1.5 w-full rounded-xl border px-3 py-2.5">
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </label>
            {message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
            <button disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save settings"}</button>
          </>
        ) : (
          <p className="text-sm text-slate-500">Only the shop owner can change shop settings.</p>
        )}
      </form>

      <ChangePasswordForm />

      {canEditShop && <DangerZone shopId={shopId} shopName={shop.name} />}
    </div>
  );
}

function Field({ name, label, defaultValue, required }: { name: string; label: string; defaultValue?: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} defaultValue={defaultValue} required={required} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>;
}

function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirmPassword") || "");
    if (password.length < 6) { setMessage("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      setMessage("Your password has been updated.");
      form.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update password.";
      toast.error(msg);
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="eyebrow">Security</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">Change your password</h3>
        <p className="mt-1 text-sm text-slate-500">Update the password for your own account.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">New password<input name="password" type="password" required minLength={6} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-slate-700">Confirm password<input name="confirmPassword" type="password" required minLength={6} className="mt-1.5 w-full rounded-xl border px-3 py-2.5" /></label>
      </div>
      {message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      <button disabled={busy} className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating..." : "Update password"}</button>
    </form>
  );
}

function DangerZone({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    if (!window.confirm(`Permanently delete "${shopName}" and all its data? This cannot be undone.`)) return;
    setBusy(true);
    const result = await deleteShop(formData);
    if (result && !result.ok) {
      toast.error(result.message);
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Danger zone</p>
      <h3 className="mt-2 text-lg font-semibold text-rose-950">Delete this shop</h3>
      <p className="mt-1 text-sm text-rose-800">Permanently deletes this shop and all its products, sales, and records. You must own another shop to continue. Type the shop name to confirm.</p>
      <input type="hidden" name="shopId" value={shopId} />
      <input type="hidden" name="expectedName" value={shopName} />
      <label className="mt-4 block text-sm font-medium text-rose-900">Type <span className="font-semibold">{shopName}</span> to confirm
        <input name="confirmation" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5" placeholder={shopName} autoComplete="off" />
      </label>
      <button disabled={busy || confirm !== shopName} className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Deleting..." : "Delete shop permanently"}</button>
    </form>
  );
}
