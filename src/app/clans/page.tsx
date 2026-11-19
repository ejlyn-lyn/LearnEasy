import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ClansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header"><div><p className="eyebrow">GEMEINSCHAFT</p><h1>Clans & Ranglisten</h1><p>Gemeinsam lernen und Fortschritt vergleichen</p></div></header>
        <div className="module-detail-grid">
          <section className="panel module-detail-panel"><div className="panel-heading"><div><h2>Mein Clan</h2><p>Noch kein Clan</p></div></div><button className="primary-button full-button" type="button" disabled>Clan erstellen</button></section>
          <section className="panel module-detail-panel"><div className="panel-heading"><div><h2>Wöchentliche Rangliste</h2><p>Deine Platzierung</p></div></div><p className="empty-state">Sobald Aufgaben und Quizzes bewertet werden, erscheint hier dein Rang.</p></section>
        </div>
      </div>
    </main>
  );
}
