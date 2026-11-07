"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const returnSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(3).max(240),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
});

export async function returnSale(input: unknown) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid return." };
  const { data, error } = await context.supabase.rpc("return_sale", {
    p_sale_id: parsed.data.saleId,
    p_items: parsed.data.items,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/returns");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, returnId: data as string, message: "Return processed and stock restored." };
}
