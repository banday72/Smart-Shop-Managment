"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type ShellUser = { fullName: string; role: string };

export function AccountCard({ user }: { user?: ShellUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initials = (user?.fullName || "BM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BM";

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 text-sm font-bold text-[#0b1220]">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user?.fullName || "Banday Mart"}</p>
          <p className="text-xs capitalize text-slate-400">{user?.role || "Workspace"}</p>
        </div>
      </div>
      <button
        onClick={signOut}
        disabled={signingOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />{signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}

export function AccountCardFallback() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <span className="block h-3 w-24 animate-pulse rounded bg-white/10" />
          <span className="block h-2.5 w-16 animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-3 h-8 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}
