"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

export async function createCustomer(formData: FormData) {
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40).optional(), email: z.string().email().optional().or(z.literal("")), creditLimit: z.coerce.number().min(0) }).safeParse({ name: formData.get("name"), phone: formData.get("phone") || undefined, email: formData.get("email") || undefined, creditLimit: formData.get("creditLimit") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid customer." };
  const { error } = await context.supabase.from("customers").insert({ shop_id: context.shopId, name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email, credit_limit: parsed.data.creditLimit });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/customers"); return { ok: true, message: "Customer added." };
}
