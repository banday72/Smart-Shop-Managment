import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const instant = false;

export default async function SettingsPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("shop_id,role").eq("id", user.user.id).single();
  if (profile?.role !== "owner") redirect("/dashboard");

  const [{ data: shop }, { data: settings }] = await Promise.all([
    supabase.from("shops").select("name,address,phone,currency").eq("id", profile.shop_id).single(),
    supabase.from("shop_settings").select("locale").eq("shop_id", profile.shop_id).maybeSingle(),
  ]);

  return (
    <AppShell title="Shop settings" description="Configure your shop identity, currency, and language.">
      <SettingsForm
        shop={{
          name: shop?.name ?? "",
          address: shop?.address ?? "",
          phone: shop?.phone ?? "",
          currency: shop?.currency ?? "PKR",
        }}
        locale={settings?.locale ?? "en"}
      />
    </AppShell>
  );
}
