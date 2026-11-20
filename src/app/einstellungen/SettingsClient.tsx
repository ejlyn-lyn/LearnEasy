"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatXp } from "@/lib/xp";

type Props = {
  email: string;
  displayName: string;
  friendCode: string;
  theme: string;
  accent: string;
  birthday: string;
  xp: number;
};

export default function SettingsClient({ email, displayName, friendCode, theme, accent, birthday, xp }: Props) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedAccent, setSelectedAccent] = useState(accent);
  const [selectedBirthday, setSelectedBirthday] = useState(birthday);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Date();
  const localToday = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isBirthday = Boolean(selectedBirthday) && selectedBirthday.slice(5) === localToday;

  function previewTheme(value: string) {
    setSelectedTheme(value);
    document.documentElement.dataset.theme = value;
  }

  function previewAccent(value: string) {
    setSelectedAccent(value);
    document.documentElement.dataset.accent = value;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMessage("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), theme: selectedTheme, accent: selectedAccent, birthday: selectedBirthday || null })
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
          <div className="settings-row"><span>XP</span><strong>{formatXp(xp)} XP</strong></div>
          <label>Anzeigename
            <input value={name} maxLength={50} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>Geburtstag
            <input type="date" value={selectedBirthday} onChange={(event) => setSelectedBirthday(event.target.value)} />
            <small className="field-hint">An deinem Geburtstag wartet eine kleine Überraschung auf dich.</small>
          </label>
          <label>Erscheinungsbild
            <select value={selectedTheme} onChange={(event) => previewTheme(event.target.value)}>
              <option value="dark">Dunkel</option>
              <option value="light">Hell</option>
              <option value="midnight">Mitternacht</option>
              <option value="forest">Wald</option>
              <option value="sunset">Sonnenuntergang</option>
            </select>
          </label>
          <label>Akzentfarbe
            <select value={selectedAccent} onChange={(event) => previewAccent(event.target.value)}>
              <option value="violet">Violett</option>
              <option value="cyan">Türkis</option>
              <option value="blue">Blau</option>
              <option value="rose">Pink</option>
              <option value="amber">Amber</option>
              <option value="green">Grün</option>
              <option value="orange">Orange</option>
            </select>
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button full-button" disabled={saving} type="submit">{saving ? "Wird gespeichert…" : "Einstellungen speichern"}</button>
          {isBirthday && <div className="birthday-easter-egg" role="status">🎉 Alles Gute zum Geburtstag! Heute ist dein Lern-Glückstag.</div>}
        </form>
        <form action="/auth/signout" method="post" className="settings-signout">
          <button className="secondary-button" type="submit">Abmelden</button>
        </form>
      </div>
    </main>
  );
}
