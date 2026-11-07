"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

const expenseSchema = z.object({ category: z.string().trim().min(2).max(80), amount: z.coerce.number().positive(), expenseDate: z.string().date(), description: z.string().trim().max(500).optional(), paymentMethod: z.enum(["cash", "card", "bank_transfer", "credit", "other"]) });

export async function createExpense(formData: FormData) {
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) return { ok: false, message: context.error };
  const parsed = expenseSchema.safeParse({ category: formData.get("category"), amount: formData.get("amount"), expenseDate: formData.get("expenseDate"), description: formData.get("description") || undefined, paymentMethod: formData.get("paymentMethod") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid expense." };
  const { error } = await context.supabase.from("expenses").insert({ shop_id: context.shopId, category: parsed.data.category, amount: parsed.data.amount, expense_date: parsed.data.expenseDate, description: parsed.data.description, payment_method: parsed.data.paymentMethod, created_by: context.userId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/expenses"); revalidatePath("/reports");
  return { ok: true, message: "Expense recorded." };
}
