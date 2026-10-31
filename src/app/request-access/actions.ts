"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function requestShopAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Please sign in first." };
  const parsed = z.object({
    shopId: z.string().uuid(),
    fullName: z.string().trim().min(2).max(120),
  }).safeParse({ shopId: formData.get("shopId"), fullName: formData.get("fullName") });
  if (!parsed.success) return { ok: false, message: "Enter a valid shop ID and your name." };
  const { error } = await supabase.from("team_access_requests").insert({
    shop_id: parsed.data.shopId,
    user_id: auth.user.id,
    full_name: parsed.data.fullName,
    email: auth.user.email ?? "",
  });
  if (error) return { ok: false, message: error.code === "23505" ? "You already sent a request for this shop." : error.message };
  revalidatePath("/request-access");
  return { ok: true, message: "Request sent. Ask the owner or manager to approve it." };
}
