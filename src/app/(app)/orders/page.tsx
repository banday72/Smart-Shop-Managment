import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { formatCurrency } from "@/lib/utils";
import { OrderActions } from "./order-actions";

type OnlineOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  status: string;
  subtotal: number;
  created_at: string;
  online_order_items: { product_name: string; quantity: number; unit_price: number; line_total: number }[];
};

export default async function OrdersPage() {
  await io();
  const context = await getShopContext(["owner", "manager", "cashier"]);
  if ("error" in context) redirect("/dashboard");
  const { data: orders } = await context.supabase
    .from("online_orders")
    .select("id,order_number,customer_name,customer_phone,customer_address,status,subtotal,created_at,online_order_items(product_name,quantity,unit_price,line_total)")
    .eq("shop_id", context.shopId)
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = (orders ?? []) as OnlineOrder[];
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Customer orders</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Online orders</h2>
        <p className="mt-1 text-sm text-slate-500">Review customer orders before stock is committed.</p>
      </div>
      {entries.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {entries.map((order) => (
            <article key={order.id} className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-slate-900">{order.order_number}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString("en-PK")}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${order.status === "pending" ? "bg-amber-50 text-amber-700" : order.status === "cancelled" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{order.status}</span>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-800">{order.customer_name}</p>
                <p className="mt-1 text-slate-500">{order.customer_phone}</p>
                {order.customer_address && <p className="mt-1 text-slate-500">{order.customer_address}</p>}
              </div>
              <div className="mt-4 divide-y border-y">
                {order.online_order_items?.map((item) => <div key={`${order.id}-${item.product_name}`} className="flex justify-between gap-3 py-2 text-sm"><span>{item.quantity} × {item.product_name}</span><span>{formatCurrency(Number(item.line_total))}</span></div>)}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3"><strong>Total {formatCurrency(Number(order.subtotal))}</strong><OrderActions id={order.id} status={order.status} /></div>
            </article>
          ))}
        </div>
      ) : <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No online orders yet.</div>}
    </div>
  );
}
