"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShopContext } from "@/lib/authz";

async function updateOrder(orderId: string, operation: "confirm_online_order" | "cancel_online_order" | "fulfill_online_order") {
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) return { ok: false, message: context.error ?? "You do not have permission for this action." };
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, message: "Invalid order." };
  const { error } = await context.supabase.rpc(operation, { p_order_id: parsed.data });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/reports");
  return { ok: true, message: "Order updated." };
}

export async function confirmOrder(orderId: string) {
  return updateOrder(orderId, "confirm_online_order");
}

export async function cancelOrder(orderId: string) {
  return updateOrder(orderId, "cancel_online_order");
}

export async function fulfillOrder(orderId: string) {
  return updateOrder(orderId, "fulfill_online_order");
}
