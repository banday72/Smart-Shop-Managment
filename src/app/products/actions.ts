"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Product name is required").max(120),
  sku: z.string().trim().min(1, "SKU is required").max(60),
  barcode: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(80).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  currentStock: z.coerce.number().int().min(0).optional(),
  minimumStock: z.coerce.number().int().min(0),
});

type ActionResult = { ok: true; message: string } | { ok: false; message: string };
type AuthorizedContext =
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; shopId: string }
  | { error: string };

async function getAuthorizedContext(): Promise<AuthorizedContext> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "You must be signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("shop_id, role")
    .eq("id", userData.user.id)
    .single();
  const role = profile?.role?.toLowerCase();
  if (!profile || !role || !["owner", "manager"].includes(role)) {
    return { error: `Product management requires owner or manager access. Your current role is ${role ?? "not assigned"}. Ask the shop owner to update your profile role.` };
  }
  return { supabase, userId: userData.user.id, shopId: profile.shop_id };
}

export async function saveProduct(formData: FormData): Promise<ActionResult> {
  const context = await getAuthorizedContext();
  if (!("supabase" in context)) return { ok: false, message: context.error };

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    brand: formData.get("brand") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    currentStock: formData.get("currentStock"),
    minimumStock: formData.get("minimumStock"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid product data." };

  const product = parsed.data;
  const payload = {
    shop_id: context.shopId,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode || null,
    brand: product.brand || null,
    category_id: product.categoryId || null,
    supplier_id: product.supplierId || null,
    purchase_price: product.purchasePrice,
    selling_price: product.sellingPrice,
    minimum_stock: product.minimumStock,
    updated_at: new Date().toISOString(),
  };
  // Opening stock is only set on creation. Later changes must go through
  // purchases, sales, or adjust_stock so inventory movements stay auditable.
  const query = product.id
    ? context.supabase.from("products").update(payload).eq("id", product.id).eq("shop_id", context.shopId)
    : context.supabase.from("products").insert({ ...payload, current_stock: product.currentStock ?? 0 });
  const { error } = await query;
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That SKU already exists in this shop." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, message: product.id ? "Product updated." : "Product added." };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const context = await getAuthorizedContext();
  if (!("supabase" in context)) return { ok: false, message: context.error };
  const parsed = z.string().uuid().safeParse(productId);
  if (!parsed.success) return { ok: false, message: "Invalid product ID." };
  const { error } = await context.supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("shop_id", context.shopId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true, message: "Product archived." };
}
