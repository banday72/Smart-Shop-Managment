import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { ReturnForm } from "./return-form";

type SaleItemRow = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number | null;
  products: { name: string } | { name: string }[] | null;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  payment_method: string;
  payment_status: string;
  amount_paid: number | null;
  customers: { name: string } | { name: string }[] | null;
};

function asName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) return "Walk-in customer";
  return Array.isArray(value) ? value[0]?.name ?? "Walk-in customer" : value.name;
}

function asProductName(value: SaleItemRow["products"]) {
  if (!value) return "Product";
  return Array.isArray(value) ? value[0]?.name ?? "Product" : value.name;
}

export default async function ReturnsPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("noShop" in context ? "/setup" : "/login");
  const { supabase } = context;
  const start = new Date();
  start.setDate(start.getDate() - 90);

  const { data: sales } = await supabase
    .from("sales")
    .select("id,invoice_number,created_at,total,subtotal,discount,tax,payment_method,payment_status,amount_paid,customers(name)")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false });
  const saleIds = (sales ?? []).map((sale) => sale.id as string);
  const [{ data: items }, { data: returns }] = await Promise.all([
    saleIds.length ? supabase.from("sale_items").select("sale_id,product_id,quantity,unit_price,line_total,products(name)").in("sale_id", saleIds) : Promise.resolve({ data: [] as SaleItemRow[] }),
    saleIds.length ? supabase.from("sales_returns").select("id,sale_id").in("sale_id", saleIds) : Promise.resolve({ data: [] as { id: string; sale_id: string }[] }),
  ]);
  const returnIds = (returns ?? []).map((r) => r.id as string);
  const { data: returnedItems } = returnIds.length
    ? await supabase.from("sales_return_items").select("return_id,product_id,quantity").in("return_id", returnIds)
    : { data: [] as { return_id: string; product_id: string; quantity: number }[] };

  const returnSaleById = new Map((returns ?? []).map((r) => [r.id as string, r.sale_id as string]));
  const returnedBySaleProduct = new Map<string, number>();
  for (const ri of returnedItems ?? []) {
    const saleId = returnSaleById.get(ri.return_id as string);
    if (!saleId) continue;
    const key = `${saleId}:${ri.product_id as string}`;
    returnedBySaleProduct.set(key, (returnedBySaleProduct.get(key) ?? 0) + Number(ri.quantity));
  }

  const itemsBySale = new Map<string, SaleItemRow[]>();
  for (const item of (items ?? []) as SaleItemRow[]) {
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push(item);
    itemsBySale.set(item.sale_id, list);
  }

  const salesWithItems = ((sales ?? []) as SaleRow[])
    .map((sale) => {
      const saleItems = (itemsBySale.get(sale.id) ?? [])
        .map((item) => {
          const sold = Number(item.quantity);
          const returned = returnedBySaleProduct.get(`${sale.id}:${item.product_id}`) ?? 0;
          const returnable = Math.max(0, sold - returned);
          return {
            product_id: item.product_id,
            name: asProductName(item.products),
            sold,
            returnable,
            unit_price: Number(item.unit_price),
          };
        })
        .filter((item) => item.returnable > 0);
      return {
        id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at,
        total: Number(sale.total),
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        tax: Number(sale.tax),
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        amount_paid: Number(sale.amount_paid ?? 0),
        customer_name: asName(sale.customers),
        items: saleItems,
      };
    })
    .filter((sale) => sale.items.length);

  return <ReturnForm sales={salesWithItems} />;
}
