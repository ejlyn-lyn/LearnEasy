import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <main className="module-page"><div className="module-page-inner">
      <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
      <header className="module-detail-header"><div><p className="eyebrow">SAMMLUNG</p><h1>Abzeichen</h1><p>Deine erreichten Lern-Erfolge</p></div></header>
      <section className="module-detail-grid"><div className="panel module-detail-panel"><h2>Erste Schritte</h2><p className="empty-state">Abzeichen werden freigeschaltet, sobald Lernaktionen serverseitig ausgewertet werden.</p></div></section>
    </div></main>
  );
}
