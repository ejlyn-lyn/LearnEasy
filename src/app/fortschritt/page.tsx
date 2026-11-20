import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatXp, getLevelInfo } from "@/lib/xp";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
  const xp = profile?.xp ?? 0;
  const levelInfo = getLevelInfo(xp);

  return (
    <main className="module-page"><div className="module-page-inner">
      <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
      <header className="module-detail-header"><div><p className="eyebrow">PERSÖNLICHER FORTSCHritt</p><h1>Fortschritt</h1><p>XP, Level und Lernstatistik</p></div></header>
      <section className="stats-grid"><div className="stat-card stat-highlight"><div className="stat-icon xp-icon">✦</div><div><span className="stat-label">GESAMTE XP</span><strong>{formatXp(xp)} XP</strong></div></div><div className="stat-card"><div className="stat-icon level-icon">{levelInfo.level}</div><div><span className="stat-label">LEVEL</span><strong>Level {levelInfo.level}</strong></div></div><div className="stat-card"><div className="stat-icon streak-icon">◔</div><div><span className="stat-label">DIESES LEVEL</span><strong>{formatXp(levelInfo.levelXp)} / {formatXp(levelInfo.nextLevelXp)} XP</strong></div></div></section>
    </div></main>
  );
}
