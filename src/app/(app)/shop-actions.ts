"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

export async function switchShop(formData: FormData) {
  const context = await getShopContext();
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.string().uuid().safeParse(formData.get("shopId"));
  if (!parsed.success) return { ok: false, message: "Invalid shop." };

  const { data: membership } = await context.supabase
    .from("shop_members")
    .select("shop_id")
    .eq("user_id", context.userId)
    .eq("shop_id", parsed.data)
    .maybeSingle();
  if (!membership) return { ok: false, message: "You do not have access to that shop." };

  const { error } = await context.supabase.auth.updateUser({ data: { active_shop_id: parsed.data } });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createShop(formData: FormData) {
  const context = await getShopContext();
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(240).optional(),
    phone: z.string().trim().max(40).optional(),
    currency: z.string().trim().length(3),
    fullName: z.string().trim().max(120).optional(),
  }).safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    currency: formData.get("currency"),
    fullName: formData.get("fullName") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid shop details." };
  const { data: shopId, error } = await context.supabase.rpc("create_shop", {
    p_name: parsed.data.name,
    p_address: parsed.data.address ?? null,
    p_phone: parsed.data.phone ?? null,
    p_currency: parsed.data.currency,
    p_full_name: parsed.data.fullName ?? context.fullName,
  });
  if (error || !shopId) return { ok: false, message: error?.message ?? "Could not create shop." };
  const { error: switchError } = await context.supabase.auth.updateUser({ data: { active_shop_id: shopId } });
  if (switchError) return { ok: false, message: switchError.message };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
