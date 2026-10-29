"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

const primaryNavigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Point of sale", href: "/pos", icon: ShoppingCart },
  { label: "Purchases", href: "/purchases", icon: Truck },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Boxes },
];

const businessNavigation = [
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Expenses", href: "/expenses", icon: CircleDollarSign },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AdminShell({
  children,
  title,
  description,
  action,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#0b1220] px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Image src="/shop-management-logo.png" alt="Banday Mart" width={44} height={44} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/15" />
            <span><strong className="block text-sm tracking-wide">BANDAY MART</strong><small className="text-xs text-slate-400">Retail command center</small></span>
          </Link>
          <button className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-10 flex-1 space-y-7 overflow-y-auto">
          <NavGroup label="Workspace" items={primaryNavigation} pathname={pathname} close={() => setMobileOpen(false)} />
          <NavGroup label="Business" items={businessNavigation} pathname={pathname} close={() => setMobileOpen(false)} />
          <Link href="/store" className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15">
            <WalletCards className="h-4 w-4 text-amber-300" />Open customer store<ChevronRight className="ml-auto h-4 w-4 opacity-60" />
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Banday Pro</p>
          <p className="mt-2 text-sm text-slate-300">Your shop is ready for its next sale.</p>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>{description && <p className="mt-1 hidden text-sm text-slate-500 sm:block">{description}</p>}</div>
            </div>
            <div className="flex items-center gap-2">{action}<div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#0b1220] text-sm font-bold text-amber-300 sm:flex">BM</div></div>
          </div>
        </header>
        <div className="p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

function NavGroup({ label, items, pathname, close }: { label: string; items: typeof primaryNavigation; pathname: string; close: () => void }) {
  return <div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p><nav className="space-y-1">{items.map(({ label: itemLabel, href, icon: Icon }) => { const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-amber-300 text-[#0b1220] shadow-lg shadow-amber-500/10" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}><Icon className="h-4 w-4" />{itemLabel}</Link>; })}</nav></div>;
}
