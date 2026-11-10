"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, UserSquare2 } from "lucide-react";

export function AdminNavGroup() {
  const pathname = usePathname();

  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Administration</p>
      <nav className="space-y-1">
        <Link
          href="/admin"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/admin" ? "bg-amber-300 text-[#0b1220] shadow-lg shadow-amber-500/10" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
        >
          <UserSquare2 className="h-4 w-4" />Team access
        </Link>
        <Link
          href="/admin/audit"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname.startsWith("/admin/audit") ? "bg-amber-300 text-[#0b1220] shadow-lg shadow-amber-500/10" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
        >
          <History className="h-4 w-4" />Audit log
        </Link>
      </nav>
    </div>
  );
}
