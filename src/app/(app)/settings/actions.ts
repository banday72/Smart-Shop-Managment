"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

export async function saveSettings(formData: FormData) {
  const context = await getShopContext(["owner"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = z.object({ name: z.string().trim().min(2).max(120), address: z.string().trim().max(240).optional(), phone: z.string().trim().max(40).optional(), currency: z.string().trim().length(3), locale: z.enum(["en", "ur"]) }).safeParse({ name: formData.get("name"), address: formData.get("address") || undefined, phone: formData.get("phone") || undefined, currency: formData.get("currency"), locale: formData.get("locale") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const { data: shop, error } = await context.supabase
    .from("shops")
    .update({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      currency: parsed.data.currency,
    })
    .eq("id", context.shopId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!shop) return { ok: false, message: "Shop settings were not saved. Ask an owner to check the database policies." };
  const { error: settingsError } = await context.supabase.from("shop_settings").upsert({ shop_id: context.shopId, locale: parsed.data.locale, updated_at: new Date().toISOString() });
  if (settingsError) return { ok: false, message: settingsError.message };
  revalidatePath("/", "layout"); return { ok: true, message: "Settings saved." };
}
