import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { AddCategoryForm, ApproveRequestForm, ChangeRoleForm, RejectRequestForm } from "./team-forms";

export default async function ShopPage() {
  await io();
  const context = await getShopContext(["owner", "manager"]);
  if ("error" in context) redirect("/dashboard");
  const { supabase, shopId, userId, role } = context;

  const [{ data: shop }, { data: team }, { data: requests }, { data: categories }] = await Promise.all([
    supabase.from("shops").select("name").eq("id", shopId).single(),
    supabase.from("profiles").select("id,full_name,role").eq("shop_id", shopId).order("created_at"),
    supabase.from("team_access_requests").select("id,full_name,email,requested_role").eq("shop_id", shopId).eq("status", "pending").order("created_at"),
    supabase.from("categories").select("id,name").order("name"),
  ]);

  const isOwner = role === "owner";

  return (
    <div className="space-y-6">
        <div><p className="eyebrow">Team access</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{shop?.name ?? "My Shop"} team</h2></div>
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <p className="eyebrow">Team access</p>
          <h2 className="mt-2 text-lg font-semibold">Pending requests {requests?.length ? `(${requests.length})` : ""}</h2>
          <div className="mt-4 divide-y">
            {requests?.length ? requests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div><p className="font-semibold text-slate-800">{request.full_name || "New team member"}</p><p className="text-sm text-slate-500">{request.email} · requested as {request.requested_role}</p></div>
                <div className="flex items-center gap-2">
                  <ApproveRequestForm requestId={request.id} requestedRole={request.requested_role} />
                  <RejectRequestForm requestId={request.id} />
                </div>
              </div>
            )) : <p className="py-6 text-sm text-slate-500">No pending requests. Share the shop ID so teammates can request access.</p>}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <p className="eyebrow">Current team</p><h2 className="mt-2 text-lg font-semibold">Members</h2>
          <div className="mt-4 divide-y">
            {team?.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-medium text-slate-800">{member.full_name || "Unnamed member"}</p>{member.id === userId && <p className="text-xs text-amber-600">You</p>}</div>
                {isOwner ? (
                  <ChangeRoleForm profileId={member.id} role={member.role} />
                ) : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{member.role}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <p className="eyebrow">Catalog</p><h2 className="mt-2 text-lg font-semibold">Categories</h2>
          <p className="mt-1 text-sm text-slate-500">Categories keep the product form and reports organised.</p>
          <AddCategoryForm />
          <div className="mt-5 flex flex-wrap gap-2">
            {categories?.length ? categories.map((category) => <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">{category.name}</span>) : <p className="text-sm text-slate-500">No categories yet.</p>}
          </div>
        </section>
    </div>
  );
}
