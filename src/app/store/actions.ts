"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const orderSchema = z.object({
  shopId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(5).max(40),
  customerAddress: z.string().trim().max(240).optional(),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
});

export async function createOnlineOrder(input: unknown) {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid order." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_online_order", {
    p_shop_id: parsed.data.shopId,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_customer_address: parsed.data.customerAddress ?? null,
    p_items: parsed.data.items,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, orderNumber: data as string, message: "Order received. The shop will contact you shortly." };
}
