"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Card = { id: string; front: string; back: string };

export default function FlashcardSession({ deckId, title, initialCards }: {
  deckId: string;
  title: string;
  initialCards: Card[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [done, setDone] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [xpError, setXpError] = useState("");

  async function rate(isKnown: boolean) {
    if (isKnown) setKnown((value) => value + 1);
    else setUnknown((value) => value + 1);

    setFlipped(false);
    if (index + 1 >= initialCards.length) {
      const finalKnown = isKnown ? known + 1 : known;
      setDone(true);
      if (finalKnown === initialCards.length) {
        const supabase = createClient();
        const earned = initialCards.length * 0.5;
        const { error } = await supabase.rpc("award_flashcard_xp", {
          p_deck_id: deckId,
          p_card_count: initialCards.length,
        });
        if (error) {
          const fallback = await supabase.rpc("award_xp", { p_amount: earned });
          if (fallback.error) {
            console.error("XP konnte nicht gutgeschrieben werden:", fallback.error);
            setXpError("Die XP konnten nicht gespeichert werden. Bitte versuche es erneut.");
          }
        }
        setEarnedXp(earned);
        router.refresh();
      }
    } else {
      setIndex((value) => value + 1);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setUnknown(0);
    setDone(false);
  }

  if (initialCards.length === 0) {
    return <p className="empty-state">Dieses Deck enthält keine Karteikarten.</p>;
  }

  if (done) {
    return (
      <div className="flashcard-complete">
        <h3>Lernrunde abgeschlossen</h3>
        <p><strong>{known}</strong> gewusst · <strong>{unknown}</strong> wiederholen</p>
        {known === initialCards.length && (
          <p><strong>+{earnedXp.toFixed(1).replace(".0", "")} XP</strong> für diese perfekte Runde</p>
        )}
        {xpError && <p className="form-message">{xpError}</p>}
        <button type="button" className="primary-button" onClick={restart}>Noch einmal üben</button>
      </div>
    );
  }

  const card = initialCards[index];
  return (
    <div className="flashcard-learning">
      <div className="flashcard-progress">
        <span>{title}</span>
        <strong>Karte {index + 1} von {initialCards.length}</strong>
      </div>
      <button
        type="button"
        className={`flashcard ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped((value) => !value)}
        aria-label={flipped ? "Vorderseite anzeigen" : "Rückseite anzeigen"}
      >
        <span>{flipped ? "Rückseite" : "Vorderseite"}</span>
        <strong>{flipped ? card.back : card.front}</strong>
        <small>Zum Drehen klicken</small>
      </button>
      {flipped && (
        <div className="flashcard-rating">
          <button type="button" className="secondary-button unknown-button" onClick={() => rate(false)}>Kann ich nicht</button>
          <button type="button" className="primary-button" onClick={() => rate(true)}>Kann ich</button>
        </div>
      )}
    </div>
  );
}
