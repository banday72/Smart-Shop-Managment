import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function getUserContext() {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." as const };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "You must be signed in." as const };
  const fullName = typeof claims.claims.user_metadata?.full_name === "string" ? claims.claims.user_metadata.full_name : "";
  return { supabase, userId, fullName };
}

const loadShopContext = cache(async () => {
  const user = await getUserContext();
  if ("error" in user) return { error: user.error };
  const { supabase, userId, fullName } = user;
  const { data: claims } = await supabase.auth.getClaims();
  const activeShopId = typeof claims?.claims?.user_metadata?.active_shop_id === "string"
    ? claims.claims.user_metadata.active_shop_id
    : undefined;
  const { data: memberships } = await supabase
    .from("shop_members")
    .select("shop_id, role, full_name, created_at")
    .eq("user_id", userId)
    .order("created_at");
  const membership = memberships?.find((entry) => entry.shop_id === activeShopId) ?? memberships?.[0];
  if (!membership) return { error: "Your account is not linked to a shop.", noShop: true, userId };
  return {
    supabase,
    userId,
    shopId: membership.shop_id as string,
    role: membership.role as string,
    fullName: (membership.full_name as string) || fullName,
  };
});

export async function getShopContext(roles?: string[]) {
  const context = await loadShopContext();
  if ("error" in context) return context;
  if (roles && !roles.includes(context.role)) {
    return { error: "You do not have permission for this action." };
  }
  return context;
}
