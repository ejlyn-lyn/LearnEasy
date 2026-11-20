"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DeleteButton from "@/app/DeleteButton";

type Vocabulary = {
  id: string;
  term: string;
  translation: string;
  source: string;
};
type FlashcardDeck = { id: string; title: string; source_type: string; folder_name: string; card_count: number };

export default function EnglishClient({ initialVocabulary, initialDecks }: { initialVocabulary: Vocabulary[]; initialDecks: FlashcardDeck[] }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizResult, setQuizResult] = useState("");
  const [folderName, setFolderName] = useState("Meine Karteikarten");

  async function addWord(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("vocabulary").insert({
      owner_id: user.id,
      term: term.trim(),
      translation: translation.trim(),
      source: "Manuell",
    });
    if (error) setMessage(error.message);
    else {
      setTerm("");
      setTranslation("");
      router.refresh();
    }
    setLoading(false);
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheets = workbook.SheetNames.map((sheetName) => {
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName], {
          header: 1,
          defval: "",
          raw: false,
        });
        const header = (rows[0] ?? []).map((cell) => String(cell).toLowerCase());
        const hasHeader = header.some((cell) =>
          /(engl|term|vocab|deutsch|german|translation|übersetzung)/.test(cell),
        );
        const words = rows
          .slice(hasHeader ? 1 : 0)
          .map((row) => ({
            term: String(row[0] ?? "").trim(),
            translation: String(row[1] ?? "").trim(),
          }))
          .filter((word) => word.term && word.translation);
        return { sheetName, words };
      }).filter((sheet) => sheet.words.length > 0);

      if (sheets.length === 0) {
        setMessage("Keine Vokabeln gefunden. Verwende zwei Spalten: Englisch und Deutsch.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const allWords = sheets.flatMap((sheet) =>
        sheet.words.map((word) => ({
          ...word,
          source: `${file.name} – ${sheet.sheetName}`,
        })),
      );
      const { error } = await supabase.from("vocabulary").insert(
        allWords.map((word) => ({
          owner_id: user.id,
          term: word.term,
          translation: word.translation,
          source: word.source,
        })),
      );
      if (error) setMessage(error.message);
      else {
        let deckCount = 0;
        for (const sheet of sheets) {
          await createVocabularyDeck(sheet.words, `${file.name} – ${sheet.sheetName}`);
          deckCount += 1;
        }
        setMessage(`${allWords.length} Vokabeln aus ${deckCount} Blatt/Blättern importiert.`);
        router.refresh();
      }
    } catch {
      setMessage("Die Datei konnte nicht gelesen werden.");
    }
    setLoading(false);
    event.target.value = "";
  }

  function checkAnswer() {
    const word = initialVocabulary[quizIndex];
    if (!word) return;
    const correct = answer.trim().toLowerCase() === word.translation.trim().toLowerCase();
    setQuizResult(correct ? "Richtig!" : `Fast. Richtige Antwort: ${word.translation}`);
  }

  function nextWord() {
    setQuizIndex((index) => initialVocabulary.length ? (index + 1) % initialVocabulary.length : 0);
    setAnswer("");
    setQuizResult("");
  }

  async function createVocabularyDeck(
    words: { term: string; translation: string }[],
    title: string,
  ) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: deck } = await supabase
      .from("flashcard_decks")
      .insert({
        owner_id: user.id,
        title,
        source_type: "english",
        card_count: words.length,
        folder_name: folderName.trim() || "Meine Karteikarten",
      })
      .select("id")
      .single();
    if (!deck) return;
    await supabase.from("flashcards").insert(
      words.map((word, position) => ({
        deck_id: deck.id,
        front: word.term,
        back: word.translation,
        position,
      })),
    );
  }

  const quizWord = initialVocabulary[quizIndex];

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header">
          <div><p className="eyebrow">SPRACHTRAINER</p><h1>Englischtrainer</h1><p>Vokabeln aus Excel, CSV oder manuell verwalten</p></div>
        </header>

        {initialDecks.length > 0 && (
          <section className="panel flashcard-deck-list">
            <div className="panel-heading"><div><h2>Meine Karteikarten-Sessions</h2><p>{initialDecks.length} Deck(s)</p></div></div>
            {Array.from(new Set(initialDecks.map((deck) => deck.folder_name || "Meine Karteikarten"))).map((folder) => (
              <div className="deck-folder" key={folder}>
                <h3>▾ Ordner: {folder}</h3>
                <div className="session-card-list">
                  {initialDecks.filter((deck) => (deck.folder_name || "Meine Karteikarten") === folder).map((deck) => (
                    <div className="session-card-with-delete" key={deck.id}>
                      <Link className="session-card" href={`/session/${deck.id}`}>
                        <span className="activity-icon">A</span>
                        <div><strong>{deck.title}</strong><small>{deck.card_count || "Alle"} Karteikarten lernen</small></div>
                        <span>→</span>
                      </Link>
                      <DeleteButton kind="deck" id={deck.id} label={`Deck ${deck.title}`} compact />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="social-grid">
          <section className="panel social-panel">
            <div className="panel-heading"><div><h2>Vokabeln importieren</h2><p>CSV oder Excel, je Zeile zwei Spalten</p></div></div>
            <form onSubmit={(event) => event.preventDefault()} className="learn-form">
              <label>Ordner / Einheit
                <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="z. B. Unit 1" />
              </label>
              <label>Datei auswählen
                <input type="file" accept=".csv,.xlsx,.xls" onChange={importFile} disabled={loading} />
              </label>
            </form>
            <form onSubmit={addWord} className="learn-form">
              <label>Englisch<input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="apple" required /></label>
              <label>Deutsch<input value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="Apfel" required /></label>
              <button className="primary-button full-button" disabled={loading} type="submit">Vokabel hinzufügen</button>
            </form>
            {message && <p className="form-message">{message}</p>}
          </section>

          <section className="panel social-panel">
            <div className="panel-heading"><div><h2>Vokabelquiz</h2><p>{initialVocabulary.length} gespeicherte Wörter</p></div></div>
            {quizWord ? (
              <div className="learn-form">
                <div className="quiz-word">{quizWord.term}</div>
                <label>Deutsche Übersetzung
                  <input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && checkAnswer()} />
                </label>
                {quizResult && <p className="info-note">{quizResult}</p>}
                <button className="primary-button full-button" type="button" onClick={checkAnswer}>Prüfen</button>
                <button className="secondary-button full-button" type="button" onClick={nextWord}>Nächste Vokabel</button>
              </div>
            ) : (
              <p className="empty-state">Lade zuerst eine Excel- oder CSV-Datei hoch oder füge eine Vokabel hinzu.</p>
            )}
          </section>
        </div>

        <section className="panel vocabulary-list">
          <div className="panel-heading"><div><h2>Meine Vokabeln</h2><p>{initialVocabulary.length} gespeicherte Wörter</p></div></div>
          {initialVocabulary.length === 0 ? (
            <p className="empty-state">Noch keine Vokabeln vorhanden.</p>
          ) : (
            initialVocabulary.map((word) => (
              <div className="vocabulary-row" key={word.id}>
                <div><strong>{word.term}</strong><span>{word.translation}</span></div>
                <small>{word.source}</small>
                <DeleteButton kind="vocabulary" id={word.id} label={`Vokabel ${word.term}`} compact />
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
