"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  BarChart3,
  Boxes,
  ClipboardList,
  CircleDollarSign,
  Download,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const primaryNavigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Point of sale", href: "/pos", icon: ShoppingCart },
  { label: "Returns", href: "/returns", icon: ArrowDownToLine },
  { label: "Purchases", href: "/purchases", icon: Truck },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Boxes },
  { label: "Online orders", href: "/orders", icon: ClipboardList },
];

const businessNavigation = [
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Expenses", href: "/expenses", icon: CircleDollarSign },
  { label: "Settings", href: "/settings", icon: Settings },
];

const routeMeta: { href: string; title: string; description: string; action?: "export" }[] = [
  { href: "/dashboard", title: "Overview", description: "Live shop metrics and inventory health." },
  { href: "/products", title: "Products", description: "Manage your catalog, stock thresholds, and product details." },
  { href: "/pos", title: "Point of sale", description: "Search products, build a cart, and complete an atomic sale." },
  { href: "/returns", title: "Sales returns", description: "Restore stock for returned items from recent invoices." },
  { href: "/purchases", title: "Purchases & stock-in", description: "Only received purchases update stock through the database transaction." },
  { href: "/customers", title: "Customers", description: "Build stronger relationships with every sale." },
  { href: "/suppliers", title: "Suppliers", description: "Keep purchasing contacts organised and ready." },
  { href: "/reports", title: "Reports", description: "Performance for the last 30 days.", action: "export" },
  { href: "/expenses", title: "Expenses", description: "Track operating expenses separately from COGS and revenue." },
  { href: "/settings", title: "Shop settings", description: "Configure your shop identity, currency, and language." },
  { href: "/admin", title: "Team access", description: "Review access requests, manage roles, and keep categories tidy." },
  { href: "/admin/audit", title: "Audit log", description: "Review sensitive changes made in your shop." },
  { href: "/orders", title: "Online orders", description: "Review and confirm customer orders." },
  { href: "/store", title: "Customer store", description: "Share your shop's online product catalogue." },
];

function metaFor(pathname: string) {
  return routeMeta.find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`)) ?? {
    href: "",
    title: "Workspace",
    description: "",
  };
}

export function AdminShell({
  children,
  account,
  adminNav,
  sidebarStoreLink,
  headerStoreLink,
}: {
  children: React.ReactNode;
  account: React.ReactNode;
  adminNav: React.ReactNode;
  sidebarStoreLink: React.ReactNode;
  headerStoreLink: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = metaFor(pathname);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#0b1220] px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Image src="/logo.png" alt="Banday Mart" width={44} height={44} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/15" />
            <span><strong className="block text-sm tracking-wide">BANDAY MART</strong><small className="text-xs text-slate-400">Retail command center</small></span>
          </Link>
          <button className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-10 flex-1 space-y-7 overflow-y-auto">
          <NavGroup label="Workspace" items={primaryNavigation} pathname={pathname} close={() => setMobileOpen(false)} />
          <NavGroup label="Business" items={businessNavigation} pathname={pathname} close={() => setMobileOpen(false)} />
          {adminNav}
          {sidebarStoreLink}
        </div>
        {account}
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{meta.title}</h1>{meta.description && <p className="mt-1 hidden text-sm text-slate-500 sm:block">{meta.description}</p>}</div>
            </div>
            <div className="flex items-center gap-2">
              {meta.action === "export" ? (
                <a href="/api/reports/sales" className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><Download className="h-4 w-4" />Export CSV</a>
              ) : (
                <Link href="/pos" className="rounded-xl bg-[#0b1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Open POS</Link>
              )}
              {headerStoreLink}
            </div>
          </div>
        </header>
        <div className="p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

function NavGroup({ label, items, pathname, close }: { label: string; items: { label: string; href: string; icon: typeof LayoutDashboard }[]; pathname: string; close: () => void }) {
  return <div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p><nav className="space-y-1">{items.map(({ label: itemLabel, href, icon: Icon }) => { const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-amber-300 text-[#0b1220] shadow-lg shadow-amber-500/10" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}><Icon className="h-4 w-4" />{itemLabel}</Link>; })}</nav></div>;
}
