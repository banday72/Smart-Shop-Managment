import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: { old?: Record<string, unknown> | null; new?: Record<string, unknown> | null };
  created_at: string;
};

function labelForEntity(entity: string) {
  return entity.replaceAll("_", " ");
}

function summaryFor(log: AuditLog) {
  const current = log.metadata.new ?? log.metadata.old ?? {};
  const name = typeof current.name === "string" ? current.name : undefined;
  const invoice = typeof current.invoice_number === "string" ? current.invoice_number : undefined;
  const reason = typeof current.reason === "string" ? current.reason : undefined;
  return name ?? invoice ?? reason ?? log.entity_id ?? "Record";
}

export default async function AuditPage() {
  await io();
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) redirect("/admin");

  const { data: logs } = await context.supabase
    .from("audit_logs")
    .select("id,actor_id,action,entity_type,entity_id,metadata,created_at")
    .eq("shop_id", context.shopId)
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = (logs ?? []) as AuditLog[];
  const actorIds = [...new Set(entries.map((entry) => entry.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await context.supabase.from("shop_members").select("user_id,full_name,role").eq("shop_id", context.shopId).in("user_id", actorIds)
    : { data: [] };
  const actorMap = new Map((actors ?? []).map((actor) => [actor.user_id, actor]));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Accountability</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Audit log</h2>
        <p className="mt-1 text-sm text-slate-500">The latest 100 sensitive changes made in this shop.</p>
      </div>
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        {entries.length ? (
          <div className="divide-y">
            {entries.map((log) => {
              const actor = log.actor_id ? actorMap.get(log.actor_id) : null;
              return (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize text-slate-800">
                      {log.action} {labelForEntity(log.entity_type)}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">{summaryFor(log)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{actor?.full_name || "System"}{actor?.role ? ` · ${actor.role}` : ""}</p>
                    <p className="mt-1">{new Date(log.created_at).toLocaleString("en-PK")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-8 text-sm text-slate-500">No activity has been recorded yet.</p>
        )}
      </section>
    </div>
  );
}
