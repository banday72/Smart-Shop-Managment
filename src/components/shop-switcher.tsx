"use client";

import { Building2, Plus } from "lucide-react";
import { switchShop } from "@/app/(app)/shop-actions";

type ShopOption = { id: string; name: string; role: string };

export function ShopSwitcher({ shops, activeShopId }: { shops: ShopOption[]; activeShopId: string }) {
  return (
    <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Building2 className="h-3.5 w-3.5" />Current shop
      </div>
      <form action={async (formData) => {
        const result = await switchShop(formData);
        if (!result.ok) window.alert(result.message);
      }}>
        <select name="shopId" defaultValue={activeShopId} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="w-full rounded-xl border-white/10 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white">
          {shops.map((shop) => <option key={shop.id} value={shop.id} className="text-slate-900">{shop.name} · {shop.role}</option>)}
        </select>
      </form>
      <a href="/shops/new" className="mt-2 flex items-center gap-2 px-1 text-xs font-semibold text-amber-200 hover:text-amber-100">
        <Plus className="h-3.5 w-3.5" />Add another shop
      </a>
    </div>
  );
}
