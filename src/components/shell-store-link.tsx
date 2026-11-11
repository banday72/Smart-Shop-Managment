import Link from "next/link";
import { ChevronRight, Store, WalletCards } from "lucide-react";
import { getShopContext } from "@/lib/authz";

export async function ShellStoreLink({ variant }: { variant: "sidebar" | "header" }) {
  const context = await getShopContext();
  const href = "error" in context ? "/store" : `/store?shop=${context.shopId}`;

  if (variant === "header") {
    return <Link href={href} prefetch={true} className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#0b1220] text-amber-300 sm:flex" aria-label="Open customer store"><Store className="h-4 w-4" /></Link>;
  }

  return <Link href={href} prefetch={true} className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15"><WalletCards className="h-4 w-4 text-amber-300" />Open customer store<ChevronRight className="ml-auto h-4 w-4 opacity-60" /></Link>;
}
