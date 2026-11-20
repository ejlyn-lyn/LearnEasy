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

  const [profile, modules, sessions, materials, decks] = await Promise.all([
    supabase.from("profiles").select("display_name, xp").eq("id", user.id).maybeSingle(),
    supabase.from("modules").select("id, name, description, subject, is_it_module, is_private").eq("owner_id", user.id).order("created_at"),
    supabase.from("sessions").select("id, name, activity_type, privacy, module_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("materials").select("id, name, file_type, size_bytes, ai_status, module_id, session_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("flashcard_decks").select("id, title, session_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardClient
      email={user.email ?? ""}
      displayName={profile.data?.display_name ?? user.email?.split("@")[0] ?? "Lernende"}
      xp={profile.data?.xp ?? 0}
      modules={modules.data ?? []}
      sessions={sessions.data ?? []}
      materials={materials.data ?? []}
      decks={decks.data ?? []}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#090b12] px-6 py-10 text-white"><div className="mx-auto max-w-3xl p-8 text-zinc-400">Dashboard wird geladen…</div></main>}>
      <DashboardContent />
    </Suspense>
  );
}
