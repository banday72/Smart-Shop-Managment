"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const categorySchema = z.object({ name: z.string().trim().min(2).max(80) });

export async function createCategory(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid category." };
  const { error } = await context.supabase.from("categories").insert({ shop_id: context.shopId, name: parsed.data.name });
  if (error) return { ok: false, message: error.code === "23505" ? "That category already exists." : error.message };
  revalidatePath("/admin"); revalidatePath("/products");
  return { ok: true, message: "Category added." };
}

export async function updateProfileRole(formData: FormData) {
  const context = await getShopContext(["owner"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.object({ profileId: z.string().uuid(), role: z.enum(["owner", "manager", "cashier"]) }).safeParse({ profileId: formData.get("profileId"), role: formData.get("role") });
  if (!parsed.success) return { ok: false, message: "Invalid profile role." };
  if (parsed.data.profileId === context.userId && parsed.data.role !== "owner") return { ok: false, message: "You cannot remove your own owner access." };
  const { error } = await context.supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.profileId).eq("shop_id", context.shopId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Role updated." };
}

export async function approveAccessRequest(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z
    .object({ requestId: z.string().uuid(), role: z.enum(["manager", "cashier"]).default("cashier") })
    .safeParse({ requestId: formData.get("requestId"), role: formData.get("role") || "cashier" });
  if (!parsed.success) return { ok: false, message: "Invalid access request." };

  const { error } = await context.supabase.rpc("approve_team_request", {
    p_request_id: parsed.data.requestId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Team member approved." };
}

export async function rejectAccessRequest(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const requestId = z.string().uuid().safeParse(formData.get("requestId"));
  if (!requestId.success) return { ok: false, message: "Invalid access request." };

  const { error } = await context.supabase.rpc("reject_team_request", { p_request_id: requestId.data });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Request rejected." };
}
