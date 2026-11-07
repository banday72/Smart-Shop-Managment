import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { ReturnForm } from "./return-form";

type ReturnItemRow = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | { name: string }[] | null;
};

export default async function ReturnsPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("/login");
  const { supabase } = context;
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const [{ data: sales }, { data: items }] = await Promise.all([
    supabase.from("sales").select("id,invoice_number,created_at").gte("created_at", start.toISOString()).order("created_at", { ascending: false }),
    supabase.from("sale_items").select("sale_id,product_id,quantity,unit_price,products(name)"),
  ]);
  const returnItems = (items ?? []) as ReturnItemRow[];
  const salesWithItems = (sales ?? []).map((sale) => ({
    ...sale,
    items: returnItems.filter((item) => item.sale_id === sale.id).map((item) => ({
      product_id: item.product_id,
      name: Array.isArray(item.products) ? item.products[0]?.name ?? "Product" : item.products?.name ?? "Product",
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  })).filter((sale) => sale.items.length);
  return <ReturnForm sales={salesWithItems as never} />;
}
