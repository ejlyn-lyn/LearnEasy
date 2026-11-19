"use client";

import { useState } from "react";

const modules = [
  { name: "Englisch", detail: "Vokabeln & Grammatik", progress: 72, icon: "EN", tone: "violet", lessons: "12 Lektionen offen" },
  { name: "Mathematik", detail: "Algebra & Funktionen", progress: 48, icon: "π", tone: "cyan", lessons: "8 Lektionen offen" },
  { name: "Informatik", detail: "Grundlagen Python", progress: 31, icon: "</>", tone: "amber", lessons: "5 Lektionen offen" },
];

type Props = { email: string };

export default function DashboardClient({ email }: Props) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const firstName = email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Lernende";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <main className="app-shell">
      {sessionOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSessionOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="session-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Schließen" onClick={() => setSessionOpen(false)}>×</button>
            <span className="modal-icon">✦</span><h2 id="session-title">Lernsession starten</h2>
            <p>Wähle ein Modul und beginne mit einer kurzen Übungseinheit.</p>
            <div className="session-options">{modules.map((module) => <button key={module.name} type="button" onClick={() => setSessionOpen(false)}><strong>{module.name}</strong><span>{module.detail}</span></button>)}</div>
          </section>
        </div>
      )}
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">L</div><div><div className="brand-name">Learn<span>AI</span></div><div className="brand-tagline">Dein Lernfortschritt</div></div></div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <div className="nav-label">ÜBERSICHT</div>
          {[["Dashboard", "⌂"], ["Meine Module", "▣"], ["Englischtrainer", "Aa"], ["Clans & Ranglisten", "♧"]].map(([label, icon]) => (
            <button key={label} type="button" className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}><span className="nav-icon">{icon}</span>{label}</button>
          ))}
          <div className="nav-label nav-label-spaced">DEIN BEREICH</div>
          {["Fortschritt", "Abzeichen", "Einstellungen"].map((label) => (
            <button key={label} type="button" className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}><span className="nav-icon">{label === "Fortschritt" ? "◔" : label === "Abzeichen" ? "◇" : "⚙"}</span>{label}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card"><div className="streak-top"><span className="flame">♨</span><strong>7 Tage Lernserie</strong></div><p>Du bist auf einem guten Weg!</p></div>
          <div className="profile-mini"><div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div><div><strong>{displayName}</strong><span>Level 8 · 2.450 XP</span></div><form action="/auth/signout" method="post"><button className="logout-button" type="submit" aria-label="Abmelden">→</button></form></div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">L</div><strong>Learn<span>AI</span></strong></div>
          <div className="topbar-actions"><button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setNoticeOpen((open) => !open)}>♢<span className="notification-dot" /></button>{noticeOpen && <div className="notification-popover">Neue Aktivität: Dein Wochenziel ist fast erreicht.</div>}<div className="top-avatar">{displayName.slice(0, 2).toUpperCase()}</div></div>
        </header>
        <div className="dashboard">
          {activeNav !== "Dashboard" && <div className="area-banner"><strong>{activeNav}</strong><span>Dieser Bereich ist vorbereitet und wird als Nächstes mit Inhalten gefüllt.</span></div>}
          <div className="welcome-row"><div><p className="eyebrow">LERNÜBERSICHT</p><h1>Guten Morgen, {displayName} <span className="wave">✦</span></h1><p className="subtitle">Bereit, heute etwas Neues zu lernen?</p></div><button className="primary-button" type="button" onClick={() => setSessionOpen(true)}><span>✦</span> Lernsession starten</button></div>
          <section className="stats-grid"><div className="stat-card stat-highlight"><div className="stat-icon xp-icon">✦</div><div><span className="stat-label">GESAMTE XP</span><strong>2.450 <small>XP</small></strong><em>+180 diese Woche</em></div></div><div className="stat-card"><div className="stat-icon level-icon">8</div><div><span className="stat-label">AKTUELLES LEVEL</span><strong>Level 8</strong><em>Noch 550 XP bis Level 9</em></div></div><div className="stat-card"><div className="stat-icon streak-icon">♨</div><div><span className="stat-label">LERNSTUNDEN</span><strong>12,5 <small>Std.</small></strong><em>+2,5 Std. diese Woche</em></div></div></section>
          <div className="section-heading"><div><h2>Meine Module</h2><p>Deine aktuellen Lernbereiche</p></div></div>
          <section className="module-grid">{modules.map((module) => <article className="module-card" key={module.name}><div className={`module-icon ${module.tone}`}>{module.icon}</div><div className="module-card-body"><div className="module-title-row"><h3>{module.name}</h3></div><p>{module.detail}</p><div className="progress-meta"><span>Fortschritt</span><strong>{module.progress}%</strong></div><div className="progress-track"><div className={`progress-fill ${module.tone}`} style={{ width: `${module.progress}%` }} /></div><button className="module-continue" type="button" onClick={() => setSessionOpen(true)}>Weiterlernen <span>→</span></button></div></article>)}<button className="add-module" type="button" onClick={() => setSessionOpen(true)}><span>+</span><strong>Neues Modul</strong><small>Eigenes Lernfach hinzufügen</small></button></section>
          <div className="lower-grid"><section className="panel"><div className="panel-heading"><div><h2>Wochenziel</h2><p>4 von 6 Lernzielen geschafft</p></div></div><div className="goal-ring"><div><strong>68%</strong><span>geschafft</span></div></div></section><section className="panel"><div className="panel-heading"><div><h2>Letzte Aktivitäten</h2><p>Deine letzten Erfolge</p></div></div><div className="activity-list"><div className="activity-item"><div className="activity-icon">✓</div><div className="activity-text"><strong>Quiz abgeschlossen</strong><span>Englisch · Present Perfect</span></div><em>+25 XP</em></div></div></section></div>
        </div>
      </section>
    </main>
  );
}
