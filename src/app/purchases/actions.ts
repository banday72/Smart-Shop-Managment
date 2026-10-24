"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const purchaseSchema = z.object({
  supplierId: z.string().uuid().nullable(),
  invoiceNumber: z.string().trim().max(80).nullable(),
  purchasedAt: z.string().date(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitCost: z.number().min(0) })).min(1),
});

export async function createPurchase(input: unknown) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid purchase." };
  const total = parsed.data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const { data: purchase, error } = await context.supabase.from("purchases").insert({ shop_id: context.shopId, supplier_id: parsed.data.supplierId, invoice_number: parsed.data.invoiceNumber, purchased_at: parsed.data.purchasedAt, total, created_by: context.userId }).select("id").single();
  if (error || !purchase) return { ok: false, message: error?.message ?? "Could not create purchase." };
  const { error: itemError } = await context.supabase.from("purchase_items").insert(parsed.data.items.map((item) => ({ purchase_id: purchase.id, product_id: item.productId, quantity: item.quantity, unit_cost: item.unitCost })));
  if (itemError) return { ok: false, message: itemError.message };
  revalidatePath("/purchases");
  return { ok: true, message: "Purchase order created." };
}

export async function receivePurchase(purchaseId: string) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const { error } = await context.supabase.rpc("receive_purchase", { p_purchase_id: purchaseId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/purchases"); revalidatePath("/products"); revalidatePath("/dashboard");
  return { ok: true, message: "Stock received and inventory updated." };
}
