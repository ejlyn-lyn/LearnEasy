import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ModuleClient from "./ModuleClient";
import FlashcardSessionCreator from "./FlashcardSessionCreator";

type Props = { params: Promise<{ id: string }> };

export default async function ModulePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isGibbStudent =
    typeof user.email === "string" &&
    user.email.toLowerCase().trim().split("@")[1] === "stud.gibb.ch";

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("id, name, description, subject, is_it_module, is_private")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (moduleError || !module) redirect("/dashboard");

  const [sessionsResult, materialsResult, decksResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, activity_type, privacy, created_at")
      .eq("module_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("materials")
      .select("id, name, file_type, size_bytes, ai_status, session_id, created_at")
      .eq("module_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcard_decks")
      .select("id, title, session_id")
      .eq("module_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sessions = sessionsResult.data ?? [];
  const materials = materialsResult.data ?? [];
  const decks = decksResult.data ?? [];
  const deckBySessionId = new Map(
    decks
      .filter((deck) => deck.session_id)
      .map((deck) => [deck.session_id as string, deck]),
  );
  const findDeckForSession = (session: (typeof sessions)[number]) =>
    deckBySessionId.get(session.id) ??
    decks.find((deck) =>
      deck.title.toLowerCase().includes(session.name.toLowerCase()) ||
      session.name.toLowerCase().includes(deck.title.toLowerCase()),
    );

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header">
          <div>
            <p className="eyebrow">{module.is_it_module ? "IT-MODUL" : "LERNMODUL"}</p>
            <h1>{module.name}</h1>
            <p>{module.description || module.subject || "Eigener Lernbereich"}</p>
          </div>
          <span className={`privacy-badge ${module.is_private ? "" : "public"}`}>{module.is_private ? "Privat" : "Öffentlich"}</span>
        </header>

        {module.is_it_module && (
          <section className="smartlearn-panel">
            <div>
              <span className="smartlearn-mark">Smartlearn</span>
              <h2>Unterrichtsblock verbinden</h2>
              {isGibbStudent ? (
                <p>Du kannst dich mit dem offiziellen GIBB-Smartlearn-Login anmelden. LearnAI fragt dabei keine GIBB-Passwörter ab.</p>
              ) : (
                <p>Smartlearn steht nur für ein GIBB-Konto mit der E-Mail-Adresse <strong>@stud.gibb.ch</strong> zur Verfügung.</p>
              )}
            </div>
            {isGibbStudent ? (
              <a className="smartlearn-login-button" href="/auth/smartlearn" target="_blank" rel="noopener noreferrer">
                Mit GIBB anmelden
              </a>
            ) : (
              <button type="button" disabled>Mit GIBB anmelden</button>
            )}
          </section>
        )}

        <ModuleClient
          moduleId={module.id}
          moduleName={module.name}
          initialMaterials={materials.map((material) => ({
            id: material.id,
            name: material.name,
            file_type: material.file_type,
            size_bytes: material.size_bytes,
            ai_status: material.ai_status,
          }))}
        />

        <div className="module-detail-grid">
          <section className="panel module-detail-panel">
            <div className="panel-heading"><div><h2>Unterrichtssessions</h2><p>{sessions.length} Session(s)</p></div></div>
            {materials.length > 0 && (
              <FlashcardSessionCreator
                moduleId={module.id}
                initialMaterials={materials.map((material) => ({ id: material.id, name: material.name }))}
              />
            )}
            {decks.length > 0 && (
              <div className="session-card-list module-deck-list">
                {decks.map((deck) => (
                  <Link className="session-card" href={`/session/${deck.id}`} key={deck.id}>
                    <span className="activity-icon">A</span>
                    <div><strong>{deck.title}</strong><small>Karteikarten-Session öffnen</small></div>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            )}
            {sessions.length === 0 ? (
              <p className="empty-state">Für dieses Modul wurde noch keine Unterrichtssession erstellt.</p>
            ) : (
              <div className="activity-list">
                {sessions.map((session) => (
                  (() => {
                    const deck = findDeckForSession(session);
                    return (
                      <Link
                        className={`activity-item ${deck ? "activity-item-link" : ""}`}
                        href={deck ? `/session/${deck.id}` : "#"}
                        key={session.id}
                        aria-disabled={!deck}
                      >
                        <div className="activity-icon">{session.activity_type === "karteikarten" ? "A" : "✓"}</div>
                        <div className="activity-text"><strong>{session.name}</strong><span>{session.activity_type} · {session.privacy === "private" ? "Privat" : "Öffentlich"}</span></div>
                        {deck && <span className="activity-open">Lernen →</span>}
                      </Link>
                    );
                  })()
                ))}
              </div>
            )}
          </section>

          <section className="panel module-detail-panel">
            <div className="panel-heading"><div><h2>Unterlagen</h2><p>{materials.length} Datei(en)</p></div></div>
            {materials.length === 0 ? (
              <p className="empty-state">Noch keine Dateien hochgeladen. Erstelle eine Session und lade Unterlagen hinzu.</p>
            ) : (
              <div className="activity-list">
                {materials.map((material) => (
                  <article className="activity-item" key={material.id}>
                    <div className="activity-icon">▤</div>
                    <div className="activity-text"><strong>{material.name}</strong><span>{material.ai_status} · {Math.max(1, Math.round(material.size_bytes / 1024))} KB</span></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
