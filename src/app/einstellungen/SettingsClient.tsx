"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  displayName: string;
  friendCode: string;
  theme: string;
  accent: string;
  xp: number;
};

export default function SettingsClient({ email, displayName, friendCode, theme, accent, xp }: Props) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedAccent, setSelectedAccent] = useState(accent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, theme: selectedTheme, accent: selectedAccent })
      .eq("id", user.id);
    setSaving(false);
    setMessage(error ? error.message : "Einstellungen gespeichert.");
    if (!error) router.refresh();
  }

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header">
          <div><p className="eyebrow">KONTO</p><h1>Einstellungen</h1><p>Profil, Freundescode und Erscheinungsbild</p></div>
        </header>

        <form onSubmit={save} className="panel settings-panel learn-form">
          <div className="settings-row"><span>Dein Freundescode</span><strong className="friend-code">{friendCode}</strong></div>
          <div className="settings-row"><span>E-Mail</span><strong>{email}</strong></div>
          <div className="settings-row"><span>XP</span><strong>{xp} XP</strong></div>
          <label>Anzeigeame
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>Erscheinungsbild
            <select value={selectedTheme} onChange={(event) => setSelectedTheme(event.target.value)}>
              <option value="dark">Dunkel</option>
              <option value="light">Hell</option>
              <option value="midnight">Mitternacht</option>
            </select>
          </label>
          <label>Akzentfarbe
            <select value={selectedAccent} onChange={(event) => setSelectedAccent(event.target.value)}>
              <option value="violet">Violett</option>
              <option value="cyan">Türkis</option>
              <option value="blue">Blau</option>
              <option value="rose">Pink</option>
              <option value="amber">Amber</option>
            </select>
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button full-button" disabled={saving} type="submit">{saving ? "Wird gespeichert…" : "Einstellungen speichern"}</button>
        </form>
        <form action="/auth/signout" method="post" className="settings-signout">
          <button className="secondary-button" type="submit">Abmelden</button>
        </form>
      </div>
    </main>
  );
}
