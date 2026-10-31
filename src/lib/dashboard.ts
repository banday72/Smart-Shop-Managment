import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type DashboardStats = {
  products: number;
  stockQuantity: number;
  todaysSales: number;
  todaysPurchases: number;
  grossProfit: number;
  lowStock: number;
  outOfStock: number;
  recentSales: Array<{
    id: string;
    invoice_number: string;
    total: number;
    payment_method: string;
    created_at: string;
  }>;
  topProducts: Array<{ name: string; quantity: number }>;
  salesByDay: Array<{ label: string; amount: number }>;
};

const emptyStats: DashboardStats = {
  products: 0,
  stockQuantity: 0,
  todaysSales: 0,
  todaysPurchases: 0,
  grossProfit: 0,
  lowStock: 0,
  outOfStock: 0,
  recentSales: [],
  topProducts: [],
  salesByDay: [],
};

export async function getDashboardStats(): Promise<{
  configured: boolean;
  authenticated: boolean;
  fullName: string;
  role: string;
  stats: DashboardStats;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, fullName: "", role: "", stats: emptyStats };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { configured: true, authenticated: false, fullName: "", role: "", stats: emptyStats };
  }
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userData.user.id).single();

  const today = new Date();
  const pakistanDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(today);
  const todayIso = `${pakistanDate}T00:00:00+05:00`;
  const { data: products } = await supabase
    .from("products")
    .select("id, name, current_stock, minimum_stock")
    .eq("is_active", true);
  const { data: sales } = await supabase
    .from("sales")
    .select("id, invoice_number, total, payment_method, created_at, gross_profit")
    .gte("created_at", todayIso)
    .order("created_at", { ascending: false })
    .limit(8);
  const { data: purchases } = await supabase
    .from("purchases")
    .select("total")
    .eq("status", "received")
    .gte("received_at", todayIso);
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString();
  const { data: weeklySales } = await supabase
    .from("sales")
    .select("total, created_at")
    .gte("created_at", weekStart);
  const { data: topItems } = await supabase
    .from("sale_items")
    .select("quantity, products(name), sales!inner(created_at)")
    .gte("sales.created_at", weekStart);

  const safeProducts = products ?? [];
  const safeSales = sales ?? [];
  const dayFormatter = new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "Asia/Karachi" });
  const dayTotals = new Map<string, number>();
  (weeklySales ?? []).forEach((sale) => {
    const label = dayFormatter.format(new Date(sale.created_at));
    dayTotals.set(label, (dayTotals.get(label) ?? 0) + Number(sale.total));
  });
  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const label = dayFormatter.format(new Date(Date.now() - (6 - index) * 86400000));
    return { label, amount: dayTotals.get(label) ?? 0 };
  });

  const productTotals = new Map<string, number>();
  (topItems ?? []).forEach((item) => {
    const name = (item.products as { name?: string } | null)?.name;
    if (!name) return;
    productTotals.set(name, (productTotals.get(name) ?? 0) + Number(item.quantity));
  });
  const topProducts = Array.from(productTotals.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    configured: true,
    authenticated: true,
    fullName: profile?.full_name ?? "",
    role: profile?.role ?? "",
    stats: {
      products: safeProducts.length,
      stockQuantity: safeProducts.reduce((sum, product) => sum + Number(product.current_stock), 0),
      todaysSales: safeSales.reduce((sum, sale) => sum + Number(sale.total), 0),
      todaysPurchases: (purchases ?? []).reduce((sum, purchase) => sum + Number(purchase.total), 0),
      grossProfit: safeSales.reduce((sum, sale) => sum + Number(sale.gross_profit ?? 0), 0),
      lowStock: safeProducts.filter(
        (product) => Number(product.current_stock) > 0 && Number(product.current_stock) <= Number(product.minimum_stock),
      ).length,
      outOfStock: safeProducts.filter((product) => Number(product.current_stock) <= 0).length,
      recentSales: safeSales,
      topProducts,
      salesByDay,
    },
  };
}
