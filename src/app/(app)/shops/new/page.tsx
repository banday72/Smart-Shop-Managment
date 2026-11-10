import { io } from "next/cache";
import { redirect } from "next/navigation";
import { getShopContext } from "@/lib/authz";
import { CreateShopForm } from "./shop-form";

export default async function NewShopPage() {
  await io();
  const context = await getShopContext();
  if ("error" in context) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="eyebrow">Workspace setup</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create another shop</h2>
        <p className="mt-1 text-sm text-slate-500">You will become the owner and can invite the shop team afterward.</p>
      </div>
      <CreateShopForm defaultName="" defaultFullName={context.fullName} />
    </div>
  );
}
