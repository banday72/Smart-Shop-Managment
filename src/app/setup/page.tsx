import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authz";
import { CreateShopForm } from "../(app)/shops/new/shop-form";

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupContent />
    </Suspense>
  );
}

function SetupFallback() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-12 text-sm text-slate-500">Loading setup...</main>;
}

async function SetupContent() {
  await connection();
  const user = await getUserContext();
  if ("error" in user) redirect("/login");

  const { data: membership } = await user.supabase
    .from("shop_members")
    .select("shop_id")
    .eq("user_id", user.userId)
    .limit(1)
    .maybeSingle();
  if (membership) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <p className="eyebrow">Account setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Set up your shop</h1>
          <p className="mt-1 text-sm text-slate-500">Your account is not linked to a shop yet. Create one below, or request access if you should join an existing shop.</p>
        </div>
        <CreateShopForm defaultName="" defaultFullName={user.fullName} />
        <p className="text-sm text-slate-500">Joining an existing shop? <Link href="/request-access" className="font-semibold text-amber-700 hover:text-amber-800">Request access with a Shop ID</Link></p>
      </div>
    </main>
  );
}