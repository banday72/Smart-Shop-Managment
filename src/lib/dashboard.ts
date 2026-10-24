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
  stats: DashboardStats;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, stats: emptyStats };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { configured: true, authenticated: false, stats: emptyStats };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
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
  const { data: weeklySales } = await supabase
    .from("sales")
    .select("total, created_at")
    .gte("created_at", new Date(Date.now() - 6 * 86400000).toISOString());

  const safeProducts = products ?? [];
  const safeSales = sales ?? [];
  const dayTotals = new Map<string, number>();
  (weeklySales ?? []).forEach((sale) => {
    const label = new Intl.DateTimeFormat("en-PK", { weekday: "short" }).format(
      new Date(sale.created_at),
    );
    dayTotals.set(label, (dayTotals.get(label) ?? 0) + Number(sale.total));
  });

  return {
    configured: true,
    authenticated: true,
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
      topProducts: [],
      salesByDay: Array.from(dayTotals.entries()).map(([label, amount]) => ({ label, amount })),
    },
  };
}
