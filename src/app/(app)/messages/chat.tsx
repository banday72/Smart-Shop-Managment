"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X, FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};
type Member = { user_id: string; full_name: string; role: string };

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatSize(size: number | null) {
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    let cancelled = false;
    const needed = messages.filter((m) => m.attachment_path && !urls[m.id]);
    if (!needed.length) return;
    (async () => {
      const entries = await Promise.all(
        needed.map(async (m) => {
          const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(m.attachment_path!, 3600);
          return [m.id, data?.signedUrl ?? ""] as const;
        }),
      );
      if (cancelled) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of entries) if (url) next[id] = url;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, supabase, urls]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !file) || !selectedId || sending) return;
    if (file && file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10 MB).");
      return;
    }
    setSending(true);
    setError("");
    try {
      let attachment: { path: string; name: string; type: string; size: number } | null = null;
      if (file) {
        const path = `${shopId}/${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        attachment = { path, name: file.name, type: file.type || "application/octet-stream", size: file.size };
      }
      const { data, error: insertError } = await supabase
        .from("direct_messages")
        .insert({
          shop_id: shopId,
          sender_id: userId,
          recipient_id: selectedId,
          body: body || null,
          attachment_path: attachment?.path ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_type: attachment?.type ?? null,
          attachment_size: attachment?.size ?? null,
        })
        .select("id,sender_id,recipient_id,body,created_at,attachment_path,attachment_name,attachment_type,attachment_size")
        .single();
      if (insertError) throw insertError;
      if (data) {
        setText("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const nameFor = (id: string) => members.find((m) => m.user_id === id)?.full_name || "Team member";

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[420px] grid-cols-1 overflow-hidden rounded-3xl border bg-white shadow-sm md:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
        <div className="border-b px-4 py-4">
          <p className="eyebrow">Direct messages</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Team members</h2>
        </div>
        <div className="max-h-48 overflow-y-auto md:h-[calc(100%-73px)] md:max-h-none">
          {others.length ? (
            others.map((m) => {
              const active = m.user_id === selectedId;
              const last = [...messages].reverse().find(
                (x) =>
                  (x.sender_id === userId && x.recipient_id === m.user_id) ||
                  (x.sender_id === m.user_id && x.recipient_id === userId),
              );
              const preview = last ? (last.body?.trim() || (last.attachment_name ? `📎 ${last.attachment_name}` : "")) : m.role;
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setSelectedId(m.user_id)}
                  className={`w-full border-b px-4 py-3 text-left transition ${active ? "bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <p className="truncate text-sm font-semibold text-slate-800">{m.full_name || "Team member"}</p>
                  <p className="truncate text-xs text-slate-500">{preview}</p>
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
                  const url = urls[m.id];
                  const isImage = m.attachment_type?.startsWith("image/");
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-[#0b1220] text-white" : "bg-slate-100 text-slate-800"}`}>
                        {m.body?.trim() ? <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p> : null}
                        {m.attachment_path ? (
                          url ? (
                            isImage ? (
                              <a href={url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl">
                                <img src={url} alt={m.attachment_name || "Attachment"} className="max-h-56 w-auto max-w-full rounded-xl object-cover" />
                              </a>
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${mine ? "border-white/20 hover:bg-white/10" : "border-slate-200 hover:bg-white"}`}>
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{m.attachment_name || "Attachment"}</span>
                                <span className={`text-xs ${mine ? "text-slate-300" : "text-slate-500"}`}>{formatSize(m.attachment_size)}</span>
                                <Download className="h-4 w-4 shrink-0" />
                              </a>
                            )
                          ) : (
                            <p className={`mt-2 text-xs ${mine ? "text-slate-300" : "text-slate-500"}`}>Loading attachment...</p>
                          )
                        ) : null}
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
              {file && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{file.name} <span className="text-slate-400">({formatSize(file.size)})</span></span>
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="rounded p-1 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border p-2.5 text-slate-600 hover:bg-slate-50" title="Attach file"><Paperclip className="h-5 w-5" /></button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={1}
                  placeholder={`Message ${nameFor(selectedId)}...`}
                  className="flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm"
                />
                <button disabled={sending || (!text.trim() && !file)} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
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
