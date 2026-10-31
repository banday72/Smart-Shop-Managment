"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { approveAccessRequest, createCategory, rejectAccessRequest, updateProfileRole } from "./actions";

export function ApproveRequestForm({ requestId, requestedRole }: { requestId: string; requestedRole: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await approveAccessRequest(formData);
    const message = result.message ?? "The request could not be approved.";
    if (result.ok) {
      toast.success(message);
      router.refresh();
    } else {
      toast.error(message);
    }
    setBusy(false);
  }

  return (
    <form action={submit} className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <select name="role" defaultValue={requestedRole === "manager" ? "manager" : "cashier"} className="rounded-lg border px-2 py-2 text-sm">
        <option value="cashier">Cashier</option>
        <option value="manager">Manager</option>
      </select>
      <button disabled={busy} className="rounded-lg bg-[#0b1220] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Approving..." : "Approve"}
      </button>
    </form>
  );
}

export function RejectRequestForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await rejectAccessRequest(formData);
    const message = result.message ?? "The request could not be rejected.";
    if (result.ok) {
      toast.success(message);
      router.refresh();
    } else {
      toast.error(message);
    }
    setBusy(false);
  }

  return (
    <form action={submit}>
      <input type="hidden" name="requestId" value={requestId} />
      <button disabled={busy} className="rounded-lg border px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60">
        {busy ? "Rejecting..." : "Reject"}
      </button>
    </form>
  );
}

export function ChangeRoleForm({ profileId, role }: { profileId: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await updateProfileRole(formData);
    const message = result.message ?? "The role could not be updated.";
    if (result.ok) {
      toast.success(message);
      router.refresh();
    } else {
      toast.error(message);
    }
    setBusy(false);
  }

  return (
    <form action={submit} className="flex items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <select name="role" defaultValue={role} className="rounded-lg border px-2 py-1.5 text-sm">
        <option value="owner">Owner</option>
        <option value="manager">Manager</option>
        <option value="cashier">Cashier</option>
      </select>
      <button disabled={busy} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-60">
        {busy ? "Updating..." : "Update"}
      </button>
    </form>
  );
}

export function AddCategoryForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    const result = await createCategory(formData);
    const message = result.message ?? "The category could not be added.";
    if (result.ok) {
      toast.success(message);
      router.refresh();
    } else {
      toast.error(message);
    }
    setBusy(false);
  }

  return (
    <form action={submit} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-56 flex-1 text-sm font-medium text-slate-700">
        New category
        <input required name="name" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="e.g. Beverages" />
      </label>
      <button disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Adding..." : "Add category"}
      </button>
    </form>
  );
}
