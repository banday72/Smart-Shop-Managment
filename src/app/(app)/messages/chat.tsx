"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type Member = { user_id: string; full_name: string; role: string };

export function DirectMessages({
  shopId,
  userId,
  members,
  initialMessages,
}: {
  shopId: string;
  userId: string;
  members: Member[];
  initialMessages: Msg[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const others = members.filter((m) => m.user_id !== userId);
  const [selectedId, setSelectedId] = useState<string | null>(others[0]?.user_id ?? null);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const thread = messages.filter(
    (m) =>
      selectedId &&
      ((m.sender_id === userId && m.recipient_id === selectedId) ||
        (m.sender_id === selectedId && m.recipient_id === userId)),
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, selectedId]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm-${shopId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `shop_id=eq.${shopId}` },
        (payload) => {
          const msg = payload.new as Msg;
          if (msg.sender_id !== userId && msg.recipient_id !== userId) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, userId, supabase]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("direct_messages")
      .insert({ shop_id: shopId, sender_id: userId, recipient_id: selectedId, body })
      .select("id,sender_id,recipient_id,body,created_at")
      .single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setText("");
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
    }
    setSending(false);
  }

  const nameFor = (id: string) => members.find((m) => m.user_id === id)?.full_name || "Team member";

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[420px] grid-cols-1 overflow-hidden rounded-3xl border bg-white shadow-sm md:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
        <div className="border-b px-4 py-4">
          <p className="eyebrow">Direct messages</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Team members</h2>
        </div>
        <div className="max-h-48 overflow-y-auto md:max-h-none md:h-[calc(100%-73px)]">
          {others.length ? (
            others.map((m) => {
              const active = m.user_id === selectedId;
              const last = [...messages].reverse().find(
                (x) =>
                  (x.sender_id === userId && x.recipient_id === m.user_id) ||
                  (x.sender_id === m.user_id && x.recipient_id === userId),
              );
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setSelectedId(m.user_id)}
                  className={`w-full border-b px-4 py-3 text-left transition ${active ? "bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <p className="truncate text-sm font-semibold text-slate-800">{m.full_name || "Team member"}</p>
                  <p className="truncate text-xs text-slate-500">{last ? last.body : m.role}</p>
                </button>
              );
            })
          ) : (
            <p className="p-4 text-sm text-slate-500">No other members in this shop yet.</p>
          )}
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">
        {selectedId ? (
          <>
            <div className="border-b px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">{nameFor(selectedId)}</h3>
              <p className="text-sm text-slate-500">Private conversation</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {thread.length ? (
                thread.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-[#0b1220] text-white" : "bg-slate-100 text-slate-800"}`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-slate-300" : "text-slate-400"}`}>{new Date(m.created_at).toLocaleString("en-PK")}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hello.</p>
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
                  placeholder={`Message ${nameFor(selectedId)}...`}
                  className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
                />
                <button disabled={sending || !text.trim()} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Select a member to start a direct message.</div>
        )}
      </section>
    </div>
  );
}
