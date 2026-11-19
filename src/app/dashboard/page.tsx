import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <DashboardClient email={user.email ?? ""} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#090b12] px-6 py-10 text-white"><div className="mx-auto max-w-3xl p-8 text-zinc-400">Dashboard wird geladen…</div></main>}>
      <DashboardContent />
    </Suspense>
  );
}
