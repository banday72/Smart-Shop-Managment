import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function getShopContext(roles?: string[]) {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." } as const;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You must be signed in." } as const;
  const { data: profile } = await supabase.from("profiles").select("shop_id, role, full_name").eq("id", auth.user.id).single();
  if (!profile) return { error: "Your account is not linked to a shop." } as const;
  if (roles && !roles.includes(profile.role)) return { error: "You do not have permission for this action." } as const;
  return { supabase, userId: auth.user.id, shopId: profile.shop_id, role: profile.role, fullName: profile.full_name } as const;
}
