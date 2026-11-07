"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const schema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40).optional(), email: z.string().email().optional().or(z.literal("")), address: z.string().trim().max(240).optional() });

export async function createSupplier(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = schema.safeParse({ name: formData.get("name"), phone: formData.get("phone") || undefined, email: formData.get("email") || undefined, address: formData.get("address") || undefined });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid supplier." };
  const { error } = await context.supabase.from("suppliers").insert({ shop_id: context.shopId, ...parsed.data });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/suppliers"); revalidatePath("/purchases");
  return { ok: true, message: "Supplier added." };
}
