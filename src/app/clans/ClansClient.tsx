"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Clan = { id: string; name: string; join_code: string; xp: number };
type Props = { friendCode: string; xp: number; clan: Clan | null; topClans: Array<{ id: string; name: string; xp: number }> };

export default function ClansClient({ friendCode, xp, clan, topClans }: Props) {
  const router = useRouter();
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [clanName, setClanName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function addFriend(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_friend", { p_friend_code: friendCodeInput });
    if (error) setMessage(error.message);
    else if (data === "OK") setMessage("Freund erfolgreich hinzugefügt.");
    else if (data === "SELBST") setMessage("Das ist dein eigener Freundescode.");
    else setMessage("Dieser Freundescode wurde nicht gefunden.");
    setLoading(false);
  }

  async function createClan(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_clan", { p_name: clanName });
    if (error) setMessage(error.message);
    else if (data?.error) setMessage(data.error);
    else {
      setMessage("Clan erstellt.");
      router.refresh();
    }
    setLoading(false);
  }

  async function joinClan(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_clan", { p_join_code: joinCode });
    if (error) setMessage(error.message);
    else if (data === "OK") {
      setMessage("Du bist dem Clan beigetreten.");
      router.refresh();
    } else if (data === "BEREITS") setMessage("Du bist bereits in einem Clan.");
    else setMessage("Dieser Clan-Code wurde nicht gefunden.");
    setLoading(false);
  }

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header">
          <div><p className="eyebrow">GEMEINSCHAFT</p><h1>Clans & Ranglisten</h1><p>Gemeinsam lernen und Fortschritt vergleichen</p></div>
        </header>

        <div className="social-grid">
          <section className="panel social-panel">
            <div className="panel-heading"><div><h2>Freunde</h2><p>Mit deinem persönlichen Code hinzufügen</p></div></div>
            <div className="friend-code-box"><span>Dein Freundescode</span><strong>{friendCode}</strong></div>
            <form onSubmit={addFriend} className="learn-form">
              <label>Freundescode eingeben
                <input value={friendCodeInput} onChange={(event) => setFriendCodeInput(event.target.value)} placeholder="z. B. A1B2C3D4" required />
              </label>
              <button className="primary-button full-button" disabled={loading} type="submit">Freund hinzufügen</button>
            </form>
          </section>

          <section className="panel social-panel">
            <div className="panel-heading"><div><h2>Mein Clan</h2><p>{clan ? clan.name : "Noch kein Clan"}</p></div></div>
            {clan ? (
              <div className="clan-owned">
                <div className="friend-code-box"><span>Clan-Code</span><strong>{clan.join_code}</strong></div>
                <div className="clan-xp"><span>Gemeinsame XP</span><strong>{clan.xp} XP</strong></div>
              </div>
            ) : (
              <>
                <form onSubmit={createClan} className="learn-form">
                  <label>Clan erstellen
                    <input value={clanName} onChange={(event) => setClanName(event.target.value)} placeholder="Name des Clans" required />
                  </label>
                  <button className="primary-button full-button" disabled={loading} type="submit">Clan erstellen</button>
                </form>
                <form onSubmit={joinClan} className="learn-form">
                  <label>Oder Clan-Code eingeben
                    <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="6-stelliger Code" required />
                  </label>
                  <button className="secondary-button full-button" disabled={loading} type="submit">Clan beitreten</button>
                </form>
              </>
            )}
          </section>
        </div>

        {message && <p className="form-message social-message">{message}</p>}

        <section className="panel leaderboard">
          <div className="panel-heading"><div><h2>Clan-Rangliste</h2><p>Gemeinsam gesammelte XP</p></div></div>
          {topClans.length === 0 ? (
            <p className="empty-state">Noch keine Clans vorhanden.</p>
          ) : (
            <div className="leaderboard-list">
              {topClans.map((entry, index) => (
                <div className="leaderboard-row" key={entry.id}>
                  <span className="rank">{index + 1}</span><strong>{entry.name}</strong><span>{entry.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
