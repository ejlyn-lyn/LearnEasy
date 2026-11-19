import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
  const xp = profile?.xp ?? 0;

  return (
    <main className="module-page"><div className="module-page-inner">
      <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
      <header className="module-detail-header"><div><p className="eyebrow">PERSÖNLICHER FORTSCHritt</p><h1>Fortschritt</h1><p>XP, Level und Lernstatistik</p></div></header>
      <section className="stats-grid"><div className="stat-card stat-highlight"><div className="stat-icon xp-icon">✦</div><div><span className="stat-label">GESAMTE XP</span><strong>{xp} XP</strong></div></div><div className="stat-card"><div className="stat-icon level-icon">{Math.floor(xp / 300) + 1}</div><div><span className="stat-label">LEVEL</span><strong>Level {Math.floor(xp / 300) + 1}</strong></div></div><div className="stat-card"><div className="stat-icon streak-icon">◔</div><div><span className="stat-label">DIESES LEVEL</span><strong>{xp % 300} / 300 XP</strong></div></div></section>
    </div></main>
  );
}
