import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return (
    <main className="module-page"><div className="module-page-inner">
      <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
      <header className="module-detail-header"><div><p className="eyebrow">KONTO</p><h1>Einstellungen</h1><p>Profil und Anwendung</p></div></header>
      <section className="panel settings-panel"><div className="settings-row"><span>Anzeige­name</span><strong>{profile?.display_name || user.email}</strong></div><div className="settings-row"><span>E-Mail</span><strong>{user.email}</strong></div><div className="settings-row"><span>Erscheinungsbild</span><strong>Dunkelmodus</strong></div><form action="/auth/signout" method="post"><button className="primary-button" type="submit">Abmelden</button></form></section>
    </div></main>
  );
}
