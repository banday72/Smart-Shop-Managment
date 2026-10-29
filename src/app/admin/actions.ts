"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function createCategory(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid category." };
  const { error } = await context.supabase.from("categories").insert({
    shop_id: context.shopId,
    name: parsed.data.name,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That category already exists." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin");
  revalidatePath("/products");
  return { ok: true, message: "Category added." };
}

export async function updateProfileRole(formData: FormData) {
  const context = await getShopContext(["owner"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.object({
    profileId: z.string().uuid(),
    role: z.enum(["owner", "manager", "cashier"]),
  }).safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid profile role." };
  if (parsed.data.profileId === context.userId && parsed.data.role !== "owner") {
    return { ok: false, message: "You cannot remove your own owner access." };
  }
  const { error } = await context.supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId)
    .eq("shop_id", context.shopId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Role updated." };
}
