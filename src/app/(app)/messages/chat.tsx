"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Member = { name: string; role: string };

export function TeamChat({
  shopId,
  userId,
  initialMessages,
  members,
}: {
  shopId: string;
  userId: string;
  initialMessages: Msg[];
  members: Record<string, Member>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`team-messages-${shopId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `shop_id=eq.${shopId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, supabase]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("team_messages")
      .insert({ shop_id: shopId, sender_id: userId, body })
      .select("id,sender_id,body,created_at")
      .single();
    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setText("");
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[420px] flex-col rounded-3xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <p className="eyebrow">Team chat</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">Shop messages</h2>
        <p className="mt-1 text-sm text-slate-500">Message other signed-in members of this shop in real time.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length ? (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            const who = members[m.sender_id]?.name ?? "Team member";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-[#0b1220] text-white" : "bg-slate-100 text-slate-800"}`}>
                  {!mine && <p className="mb-1 text-xs font-semibold text-amber-700">{who}</p>}
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-slate-300" : "text-slate-400"}`}>{new Date(m.created_at).toLocaleString("en-PK")}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t p-4">
        {error && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
          />
          <button disabled={sending || !text.trim()} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
