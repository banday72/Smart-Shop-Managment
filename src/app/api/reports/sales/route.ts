import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return new Response("Unauthorized", { status: 401 });
  const { data, error } = await supabase.from("sales").select("invoice_number,created_at,total,gross_profit,payment_method").order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });
  const csv = ["Invoice,Date,Payment Method,Total,Gross Profit", ...(data ?? []).map((s) => [s.invoice_number, s.created_at, s.payment_method, s.total, s.gross_profit].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=sales-report.csv" } });
}
