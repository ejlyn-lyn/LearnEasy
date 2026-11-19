"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Module = {
  id: string;
  name: string;
  description: string;
  subject: string | null;
  is_it_module: boolean;
  is_private: boolean;
};
type Session = { id: string; name: string; activity_type: string; privacy: string; module_id: string };
type Material = { id: string; name: string; file_type: string | null; size_bytes: number; ai_status: string; module_id: string; session_id: string | null };
type Props = { email: string; displayName: string; xp: number; modules: Module[]; sessions: Session[]; materials: Material[] };

export default function DashboardClient({ email, displayName, xp, modules, sessions, materials }: Props) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [moduleOpen, setModuleOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [moduleName, setModuleName] = useState("");
  const [moduleSubject, setModuleSubject] = useState("");
  const [modulePrivate, setModulePrivate] = useState(true);
  const [isItModule, setIsItModule] = useState(false);

  const [sessionName, setSessionName] = useState("");
  const [sessionModule, setSessionModule] = useState(modules[0]?.id ?? "");
  const [sessionPrivacy, setSessionPrivacy] = useState("private");
  const [activityType, setActivityType] = useState("lesen");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const level = Math.floor(xp / 300) + 1;
  const levelProgress = xp % 300;
  const initials = displayName.slice(0, 2).toUpperCase();

  async function createModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("modules").insert({
      owner_id: user.id,
      name: moduleName,
      description: moduleSubject,
      subject: moduleSubject,
      is_it_module: isItModule,
      is_private: modulePrivate,
    });
    if (error) setMessage(error.message);
    else {
      setModuleOpen(false);
      setModuleName("");
      setModuleSubject("");
      setIsItModule(false);
      setModulePrivate(true);
      router.refresh();
    }
    setLoading(false);
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionModule) {
      setMessage("Erstelle zuerst ein Modul.");
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        owner_id: user.id,
        module_id: sessionModule,
        name: sessionName,
        activity_type: activityType,
        privacy: sessionPrivacy,
      })
      .select("id")
      .single();

    if (error || !session) {
      setMessage(error?.message ?? "Die Session konnte nicht erstellt werden.");
      setLoading(false);
      return;
    }

    for (const file of selectedFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${session.id}/${Date.now()}-${safeName}`;
      const uploaded = await supabase.storage.from("learnai-materials").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploaded.error) {
        setMessage(uploaded.error.message);
        continue;
      }
      await supabase.from("materials").insert({
        owner_id: user.id,
        module_id: sessionModule,
        session_id: session.id,
        name: file.name,
        file_path: path,
        file_type: file.type || "Unbekannt",
        size_bytes: file.size,
        ai_status: "bereit",
      });
    }

    setSessionOpen(false);
    setSessionName("");
    setSelectedFiles([]);
    setLoading(false);
    router.refresh();
  }

  return (
    <main className="app-shell">
      {moduleOpen && (
        <div className="modal-backdrop" onMouseDown={() => setModuleOpen(false)}>
          <section className="modal-card modal-form" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Schließen" onClick={() => setModuleOpen(false)}>×</button>
            <span className="modal-icon">▣</span>
            <h2>Neues Modul erstellen</h2>
            <form onSubmit={createModule} className="learn-form">
              <label>Modulname<input required value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="z. B. Informatik" /></label>
              <label>Fach oder Beschreibung<input value={moduleSubject} onChange={(event) => setModuleSubject(event.target.value)} placeholder="z. B. JavaScript & Datenbanken" /></label>
              <label className="check-row"><input type="checkbox" checked={modulePrivate} onChange={(event) => setModulePrivate(event.target.checked)} />Privates Modul</label>
              <label className="check-row"><input type="checkbox" checked={isItModule} onChange={(event) => setIsItModule(event.target.checked)} />IT-Modul für Smartlearn</label>
              {isItModule && <p className="info-note">Dieses Modul wird später für eine Smartlearn-Schnittstelle oder einen offiziellen Export vorbereitet.</p>}
              {message && <p className="form-message" role="alert">{message}</p>}
              <button className="primary-button full-button" disabled={loading} type="submit">{loading ? "Wird erstellt…" : "Modul erstellen"}</button>
            </form>
          </section>
        </div>
      )}

      {sessionOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSessionOpen(false)}>
          <section className="modal-card modal-form" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Schließen" onClick={() => setSessionOpen(false)}>×</button>
            <span className="modal-icon">✦</span>
            <h2>Neue Unterrichtssession</h2>
            {modules.length === 0 ? (
              <div><p className="info-note">Du brauchst zuerst ein Modul.</p><button className="primary-button full-button" type="button" onClick={() => { setSessionOpen(false); setModuleOpen(true); }}>Modul erstellen</button></div>
            ) : (
              <form onSubmit={createSession} className="learn-form">
                <label>Sessionname<input required value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="z. B. Kapitel 3 Wiederholung" /></label>
                <label>Modul<select value={sessionModule} onChange={(event) => setSessionModule(event.target.value)}>{modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
                <label>Sichtbarkeit<select value={sessionPrivacy} onChange={(event) => setSessionPrivacy(event.target.value)}><option value="private">Privat</option><option value="public">Öffentlich</option></select></label>
                <label>Lernart<select value={activityType} onChange={(event) => setActivityType(event.target.value)}><option value="lesen">Lesen</option><option value="karteikarten">Karteikarten</option><option value="uebungen">Übungen</option><option value="schriftlich">Schriftliches Lernen</option><option value="pruefung">Prüfungssimulation</option></select></label>
                <label>Unterlagen<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))} /></label>
                {selectedFiles.length > 0 && <p className="info-note">{selectedFiles.length} Datei(en) ausgewählt</p>}
                {message && <p className="form-message" role="alert">{message}</p>}
                <button className="primary-button full-button" disabled={loading} type="submit">{loading ? "Wird erstellt…" : "Session erstellen"}</button>
              </form>
            )}
          </section>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">L</div><div><div className="brand-name">Learn<span>AI</span></div><div className="brand-tagline">Dein Lernfortschritt</div></div></div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <div className="nav-label">ÜBERSICHT</div>
          {[
            ["Dashboard", "/dashboard", "⌂"],
            ["Meine Module", "/dashboard", "▣"],
            ["Englischtrainer", "/englisch", "Aa"],
            ["Clans & Ranglisten", "/clans", "♧"],
          ].map(([label, href, icon]) => (
            <Link key={label} href={href} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}><span className="nav-icon">{icon}</span>{label}</Link>
          ))}
          <div className="nav-label nav-label-spaced">DEIN BEREICH</div>
          {[
            ["Fortschritt", "/fortschritt", "◔"],
            ["Abzeichen", "/abzeichen", "◇"],
            ["Einstellungen", "/einstellungen", "⚙"],
          ].map(([label, href, icon]) => (
            <Link key={label} href={href} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}><span className="nav-icon">{icon}</span>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini"><div className="avatar">{initials}</div><div><strong>{displayName}</strong><span>Level {level} · {xp} XP</span></div><form action="/auth/signout" method="post"><button className="logout-button" type="submit" aria-label="Abmelden">→</button></form></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">L</div><strong>Learn<span>AI</span></strong></div>
          <div className="topbar-actions"><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setNoticeOpen((open) => !open)}>♢{sessions.length > 0 && <span className="notification-dot" />}</button>{noticeOpen && <div className="notification-popover">{sessions.length > 0 ? "Du hast neue Unterrichtssessions." : "Noch keine neuen Aktivitäten."}</div>}<div className="top-avatar">{initials}</div></div>
        </header>
        <div className="dashboard">
          <div className="welcome-row"><div><p className="eyebrow">LERNÜBERSICHT</p><h1>Willkommen, {displayName} <span className="wave">✦</span></h1><p className="subtitle">Erstelle dein erstes Modul oder eine neue Lernsession.</p></div><button className="primary-button" type="button" onClick={() => setSessionOpen(true)}><span>✦</span> Neue Unterrichtssession</button></div>

          <section className="stats-grid">
            <div className="stat-card stat-highlight"><div className="stat-icon xp-icon">✦</div><div><span className="stat-label">GESAMTE XP</span><strong>{xp} <small>XP</small></strong><em>Serververwalteter Fortschritt</em></div></div>
            <div className="stat-card"><div className="stat-icon level-icon">{level}</div><div><span className="stat-label">AKTUELLES LEVEL</span><strong>Level {level}</strong><em>{levelProgress} / 300 XP in diesem Level</em></div></div>
            <div className="stat-card"><div className="stat-icon streak-icon">▣</div><div><span className="stat-label">UNTERRICHTSSESSIONS</span><strong>{sessions.length}</strong><em>{materials.length} hochgeladene Unterlage(n)</em></div></div>
          </section>

          <div className="section-heading"><div><h2>Meine Module</h2><p>{modules.length === 0 ? "Noch keine Module vorhanden" : "Deine Lernbereiche"}</p></div><button className="text-button" type="button" onClick={() => setModuleOpen(true)}>+ Neues Modul</button></div>
          <section className="module-grid">
            {modules.map((module, index) => (
              <Link className="module-card module-card-link" href={`/module/${module.id}`} key={module.id}>
                <div className={`module-icon ${index % 3 === 0 ? "violet" : index % 3 === 1 ? "cyan" : "amber"}`}>{module.is_it_module ? "IT" : module.name.slice(0, 2).toUpperCase()}</div>
                <div className="module-card-body"><div className="module-title-row"><h3>{module.name}</h3></div><p>{module.description || (module.is_private ? "Privates Modul" : "Öffentliches Modul")}</p><div className="progress-meta"><span>{module.is_it_module ? "IT-Modul · Smartlearn vorbereitet" : "Eigenes Lernmodul"}</span></div><span className="module-continue">Modul öffnen <span>→</span></span></div>
              </Link>
            ))}
            <button className="add-module" type="button" onClick={() => setModuleOpen(true)}><span>+</span><strong>Neues Modul</strong><small>Eigenes Lernfach hinzufügen</small></button>
          </section>

          <div className="lower-grid">
            <section className="panel">
              <div className="panel-heading"><div><h2>Unterrichtssessions</h2><p>{sessions.length === 0 ? "Noch keine Sessions erstellt" : "Deine letzten Lernbereiche"}</p></div></div>
              {sessions.length === 0 ? (
                <p className="empty-state">Starte deine erste Session und lade passende Unterlagen hoch.</p>
              ) : (
                <div className="activity-list">
                  {sessions.slice(0, 5).map((session) => (
                    <div className="activity-item" key={session.id}>
                      <div className="activity-icon">{session.activity_type === "karteikarten" ? "A" : "✓"}</div>
                      <div className="activity-text"><strong>{session.name}</strong><span>{session.activity_type} · {session.privacy === "private" ? "Privat" : "Öffentlich"}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h2>Unterlagen</h2><p>{materials.length === 0 ? "Noch nichts hochgeladen" : "Zu deinen Sessions hochgeladene Dateien"}</p></div></div>
              {materials.length === 0 ? (
                <p className="empty-state">PDF, Word, PowerPoint, Bilder und Textdateien können einer Session zugeordnet werden.</p>
              ) : (
                <div className="activity-list">
                  {materials.slice(0, 5).map((material) => (
                    <div className="activity-item" key={material.id}>
                      <div className="activity-icon">▤</div>
                      <div className="activity-text"><strong>{material.name}</strong><span>{material.ai_status} · {Math.max(1, Math.round(material.size_bytes / 1024))} KB</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
