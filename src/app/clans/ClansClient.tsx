"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatXp, getLevelInfo } from "@/lib/xp";

type Clan = { id: string; name: string; join_code: string; xp: number };
type Friend = { friendship_id: string; display_name: string; xp: number; status: string; direction: string; created_at: string };
type ClanMember = { user_id: string; display_name: string; xp: number; role: string; joined_at: string };
type Notification = { id: string; message: string; created_at: string; read_at: string | null };
type Props = {
  friendCode: string;
  xp: number;
  clan: Clan | null;
  topClans: Array<{ id: string; name: string; xp: number }>;
  friends: Friend[];
  clanMembers: ClanMember[];
  notifications: Notification[];
};

export default function ClansClient({ friendCode, xp, clan, topClans, friends, clanMembers, notifications }: Props) {
  const [activeTab, setActiveTab] = useState<"friends" | "clan">("friends");
  const friendRequests = friends.filter((friend) => friend.status === "pending" && friend.direction === "incoming");
  const acceptedFriends = friends.filter((friend) => friend.status === "accepted");
  function ProgressBar({ value }: { value: number }) {
    const numericValue = Number(value) || 0;
    const level = getLevelInfo(numericValue);
    const progress = level.nextLevelXp > 0
      ? Math.min(100, (level.levelXp / level.nextLevelXp) * 100)
      : 100;
    return (
      <div className="level-progress">
        <div className="level-progress-label"><span>Level {level.level}</span><span>{formatXp(level.levelXp)} / {formatXp(level.nextLevelXp)} XP</span></div>
        <div className="level-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
    );
  }
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
    else if (data === "OK") setMessage("Freundschaftsanfrage gesendet.");
    else if (data === "SELBST") setMessage("Das ist dein eigener Freundescode.");
    else if (data === "BEREITS") setMessage("Ihr seid bereits befreundet.");
    else if (data === "BEREITS_ANGEFRAGT") setMessage("Die Anfrage wurde bereits gesendet.");
    else if (data === "ANFRAGE_VORHANDEN") setMessage("Diese Person hat dir bereits eine Anfrage geschickt.");
    else setMessage("Dieser Freundescode wurde nicht gefunden.");
    setLoading(false);
  }

  async function respondToRequest(id: string, action: "accept_friend_request" | "reject_friend_request") {
    setLoading(true);
    setMessage("");
    const { data, error } = await createClient().rpc(action, { p_friendship_id: id });
    if (error) setMessage(error.message);
    else if (data === "OK") {
      setMessage(action === "accept_friend_request" ? "Freundschaftsanfrage angenommen." : "Anfrage abgelehnt.");
      router.refresh();
    } else setMessage("Die Anfrage ist nicht mehr verfügbar.");
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

        <nav className="social-tabs" aria-label="Gemeinschaft">
          <button className={activeTab === "friends" ? "active" : ""} type="button" onClick={() => setActiveTab("friends")}>Freunde</button>
          <button className={activeTab === "clan" ? "active" : ""} type="button" onClick={() => setActiveTab("clan")}>Clan</button>
        </nav>

        <div className="social-tab-content">
        {activeTab === "friends" ? (
          <section className="panel social-panel">
            <div className="panel-heading"><div><h2>Freunde</h2><p>Mit deinem persönlichen Code hinzufügen</p></div></div>
            <div className="friend-code-box"><span>Dein Freundescode</span><strong>{friendCode}</strong></div>
            <div className="friend-list">
              <h3>Deine Freunde ({acceptedFriends.length})</h3>
              {acceptedFriends.length === 0 ? <p className="empty-state">Noch keine angenommenen Freunde.</p> : acceptedFriends.map((friend) => (
                <div className="social-person" key={friend.friendship_id}>
                  <div><strong>{friend.display_name}</strong><ProgressBar value={friend.xp} /></div>
                  <span className="social-level">Level {getLevelInfo(friend.xp).level}</span>
                </div>
              ))}
            </div>
            <form onSubmit={addFriend} className="learn-form">
              <label>Freundescode eingeben
                <input value={friendCodeInput} onChange={(event) => setFriendCodeInput(event.target.value)} placeholder="z. B. A1B2C3D4" required />
              </label>
              <button className="primary-button full-button" disabled={loading} type="submit">Freund hinzufügen</button>
            </form>
            <div className="friend-requests">
              <h3>Freundschaftsanfragen {friendRequests.length > 0 && `(${friendRequests.length})`}</h3>
              {friendRequests.length === 0 && <p className="empty-state">Keine offenen Anfragen.</p>}
              {friendRequests.map((request) => (
                <div className="friend-request" key={request.friendship_id}>
                  <span>Neue Freundschaftsanfrage</span>
                  <div className="friend-request-actions">
                    <button className="primary-button" disabled={loading} type="button" onClick={() => respondToRequest(request.friendship_id, "accept_friend_request")}>Annehmen</button>
                    <button className="secondary-button" disabled={loading} type="button" onClick={() => respondToRequest(request.friendship_id, "reject_friend_request")}>Ablehnen</button>
                  </div>
                </div>
              ))}
            </div>
            {notifications.length > 0 && (
              <div className="friend-notifications">
                <h3>Benachrichtigungen</h3>
                {notifications.map((notification) => <p key={notification.id} className={notification.read_at ? "" : "unread-notification"}>{notification.message}</p>)}
              </div>
            )}
            {friends.some((friend) => friend.status === "pending" && friend.direction === "outgoing") && (
              <p className="pending-hint">Deine Anfrage wurde gesendet und wartet auf Annahme.</p>
            )}
          </section>
        ) : (
          <section className="panel social-panel clan-tab-panel">
            <div className="panel-heading"><div><h2>Mein Clan</h2><p>{clan ? clan.name : "Noch kein Clan"}</p></div></div>
            {clan ? (
              <div className="clan-owned">
                <div className="friend-code-box"><span>Clan-Code</span><strong>{clan.join_code}</strong></div>
                <div className="clan-xp"><span>Gemeinsame XP</span><strong>{formatXp(clan.xp)} XP</strong></div>
                <div className="clan-members">
                  <div className="clan-section-heading"><h3>Interne Rangliste</h3><span>{clanMembers.length} Mitglieder</span></div>
                  {clanMembers.map((member, index) => (
                    <div className="clan-ranking-row" key={member.user_id}>
                      <b>{index + 1}</b><span><strong>{member.display_name}</strong><ProgressBar value={member.xp} /></span><em>{formatXp(member.xp)} XP</em>
                    </div>
                  ))}
                </div>
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
        )}
        </div>

        {message && <p className="form-message social-message">{message}</p>}

        {activeTab === "clan" && <section className="panel leaderboard">
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
        </section>}
      </div>
    </main>
  );
}
