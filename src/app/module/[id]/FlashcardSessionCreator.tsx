"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Material = { id: string; name: string };
export default function FlashcardSessionCreator({
  moduleId,
  initialMaterials,
}: {
  moduleId: string;
  initialMaterials: Material[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  function parseCards(output: string) {
    const cleaned = output.replace(/```(?:json)?/gi, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((card) => typeof card?.front === "string" && typeof card?.back === "string")
          .map((card) => ({ front: card.front.trim(), back: card.back.trim() }))
          .filter((card) => card.front && card.back);
      }
    } catch {}
    return [];
  }

  async function createSession(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || selected.length === 0) {
      setMessage("Bitte Sessionnamen und mindestens eine Unterlage auswählen.");
      return;
    }
    const count = Math.max(5, Number(cardCount) || 5);
    setWorking(true);
    setMessage("");

    const response = await fetch("/api/ai/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialIds: selected, action: "karteikarten", cardCount: count }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Die Karteikarten konnten nicht erstellt werden.");
      setWorking(false);
      return;
    }

    const cards = parseCards(data.output);
    if (cards.length === 0) {
      setMessage("Die KI hat kein gültiges Kartenformat zurückgegeben.");
      setWorking(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Du bist nicht angemeldet.");
      setWorking(false);
      return;
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        owner_id: user.id,
        module_id: moduleId,
        name: name.trim(),
        activity_type: "karteikarten",
        privacy: "private",
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      setMessage(sessionError?.message ?? "Die Unterrichtssession konnte nicht erstellt werden.");
      setWorking(false);
      return;
    }

    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        owner_id: user.id,
        module_id: moduleId,
        session_id: session.id,
        title: name.trim(),
        source_type: "material",
        card_count: cards.length,
      })
      .select("id")
      .single();
    if (deckError || !deck) {
      setMessage(deckError?.message ?? "Das Karten-Deck konnte nicht erstellt werden.");
      setWorking(false);
      return;
    }

    const { error: cardsError } = await supabase.from("flashcards").insert(
      cards.map((card, position) => ({
        deck_id: deck.id,
        front: card.front,
        back: card.back,
        position,
      })),
    );
    if (cardsError) {
      setMessage(cardsError.message);
      setWorking(false);
      return;
    }

    setName("");
    setCardCount(10);
    setSelected([]);
    setWorking(false);
    router.push(`/session/${deck.id}`);
  }

  return (
    <form className="flashcard-session-create learn-form" onSubmit={createSession}>
      <label>Sessionname<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Kapitel 3 Wiederholung" /></label>
      <label>Anzahl Karteikarten<input type="number" min={5} value={cardCount} onChange={(event) => setCardCount(Math.max(5, Number(event.target.value) || 5))} /></label>
      {initialMaterials.map((material) => (
        <label className="check-row" key={material.id}>
          <input type="checkbox" checked={selected.includes(material.id)} onChange={() => setSelected((current) => current.includes(material.id) ? current.filter((id) => id !== material.id) : [...current, material.id])} />
          {material.name}
        </label>
      ))}
      {message && <p className="form-message">{message}</p>}
      <button className="primary-button full-button" disabled={working || initialMaterials.length === 0} type="submit">
        {working ? "Karten werden erstellt…" : "Karteikarten-Session erstellen"}
      </button>
    </form>
  );
}
