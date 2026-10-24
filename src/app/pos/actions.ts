"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const saleSchema = z.object({
  invoiceNumber: z.string().trim().min(3).max(60),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  tax: z.number().min(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "credit", "other"]),
  paymentStatus: z.enum(["paid", "partial", "unpaid"]),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive(), unit_price: z.number().min(0) })).min(1),
});

export async function completeSale(input: unknown) {
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid sale." };
  const { data, error } = await context.supabase.rpc("complete_sale", {
    p_invoice_number: parsed.data.invoiceNumber,
    p_subtotal: parsed.data.subtotal,
    p_discount: parsed.data.discount,
    p_tax: parsed.data.tax,
    p_payment_method: parsed.data.paymentMethod,
    p_payment_status: parsed.data.paymentStatus,
    p_items: parsed.data.items,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/reports");
  return { ok: true, saleId: data as string, message: "Sale completed successfully." };
}
