import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("noShop" in context ? "/setup" : "/dashboard");
  const { supabase, shopId, role } = context;

  const [{ data: shop }, { data: settings }] = await Promise.all([
    supabase.from("shops").select("name,address,phone,currency").eq("id", shopId).single(),
    supabase.from("shop_settings").select("locale").eq("shop_id", shopId).maybeSingle(),
  ]);

  return (
    <SettingsForm
      shopId={shopId}
      canEditShop={role === "owner"}
      shop={{
        name: shop?.name ?? "",
        address: shop?.address ?? "",
        phone: shop?.phone ?? "",
        currency: shop?.currency ?? "PKR",
      }}
      locale={settings?.locale ?? "en"}
    />
  );
}
