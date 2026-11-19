import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function EnglishPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header"><div><p className="eyebrow">SPRACHTRAINER</p><h1>Englischtrainer</h1><p>Vokabeln, Übersetzungen und Wiederholung</p></div></header>
        <div className="module-detail-grid">
          <section className="panel module-detail-panel"><div className="panel-heading"><div><h2>Meine Vokabeln</h2><p>0 gespeicherte Wörter</p></div></div><p className="empty-state">Noch keine Vokabeln vorhanden.</p></section>
          <section className="panel module-detail-panel"><div className="panel-heading"><div><h2>Vokabelquiz</h2><p>Spaced Repetition vorbereitet</p></div></div><button className="primary-button full-button" type="button" disabled>Quiz starten</button></section>
        </div>
      </div>
    </main>
  );
}
