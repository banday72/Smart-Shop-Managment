"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_id: string; recipient_id: string; body: string | null; attachment_name: string | null };

export function MessagesBadge({ shopId, userId }: { shopId: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const [names, setNames] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("shop_members").select("user_id,full_name").eq("shop_id", shopId);
      if (!active) return;
      const map: Record<string, string> = {};
      for (const m of data ?? []) map[m.user_id] = m.full_name || "Team member";
      setNames(map);
    })();
    return () => { active = false; };
  }, [shopId, supabase]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (active) setUnread(count ?? 0);
    };
    void refresh();
    const onRead = () => void refresh();
    window.addEventListener("direct-messages-read", onRead);
    return () => { active = false; window.removeEventListener("direct-messages-read", onRead); };
  }, [shopId, userId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm-notify-${shopId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `shop_id=eq.${shopId}` },
        async (payload) => {
          const msg = payload.new as Msg;
          if (msg.recipient_id !== userId) return;
          const { count } = await supabase
            .from("direct_messages")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shopId)
            .eq("recipient_id", userId)
            .is("read_at", null);
          setUnread(count ?? 0);
          if (pathnameRef.current.startsWith("/messages")) return;
          const from = names[msg.sender_id] || "Someone";
          const text = msg.body?.trim() || (msg.attachment_name ? `Sent an attachment: ${msg.attachment_name}` : "New message");
          toast.message(`New message from ${from}`, {
            description: text.length > 80 ? `${text.slice(0, 80)}…` : text,
            action: { label: "Open", onClick: () => router.push("/messages") },
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, userId, supabase, names, router]);

  if (unread <= 0) return null;
  return <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-[#0b1220]">{unread > 99 ? "99+" : unread}</span>;
}
