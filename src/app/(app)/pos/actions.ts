"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const saleSchema = z.object({
  invoiceNumber: z.string().trim().min(3).max(60),
  discount: z.number().min(0),
  tax: z.number().min(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "credit", "other"]),
  paymentStatus: z.enum(["paid", "partial", "unpaid"]),
  customerId: z.string().uuid().optional().or(z.literal("")),
  amountPaid: z.number().min(0),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function completeSale(input: unknown) {
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid sale." };

  const productIds = [...new Set(parsed.data.items.map((item) => item.product_id))];
  const { data: products, error: productsError } = await context.supabase
    .from("products")
    .select("id, name, shop_id, is_active, current_stock")
    .in("id", productIds);
  if (productsError) return { ok: false, message: productsError.message };

  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  for (const item of parsed.data.items) {
    const product = byId.get(item.product_id);
    if (!product) {
      return { ok: false, message: "Cart has an unavailable item. Refresh POS and add products again." };
    }
    if (product.shop_id !== context.shopId) {
      return { ok: false, message: `${product.name} belongs to another shop. Refresh POS and try again.` };
    }
    if (!product.is_active) {
      return { ok: false, message: `${product.name} is no longer active. Refresh POS and try again.` };
    }
    if (Number(product.current_stock) < item.quantity) {
      return { ok: false, message: `Insufficient stock for ${product.name}. Refresh POS and try again.` };
    }
  }

  const { data, error } = await context.supabase.rpc("complete_sale", {
    p_invoice_number: parsed.data.invoiceNumber,
    p_discount: parsed.data.discount,
    p_tax: parsed.data.tax,
    p_payment_method: parsed.data.paymentMethod,
    p_payment_status: parsed.data.paymentStatus,
    p_customer_id: parsed.data.customerId || null,
    p_amount_paid: parsed.data.amountPaid,
    p_items: parsed.data.items,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/reports");
  return { ok: true, saleId: data as string, message: "Sale completed successfully." };
}
