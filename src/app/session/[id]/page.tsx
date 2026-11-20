import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FlashcardSession from "./FlashcardSession";
import DeleteButton from "@/app/DeleteButton";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("id, title")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!deck) redirect("/dashboard");

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, front, back")
    .eq("deck_id", deck.id)
    .order("position", { ascending: true });

  return (
    <main className="module-page">
      <div className="module-page-inner">
        <Link className="back-link" href="/dashboard">← Zum Dashboard</Link>
        <header className="module-detail-header">
          <div><p className="eyebrow">KARTENSESSION</p><h1>{deck.title}</h1></div>
          <DeleteButton kind="deck" id={deck.id} label={`Deck ${deck.title}`} redirectTo="/dashboard" />
        </header>
        <section className="panel">
          <FlashcardSession deckId={deck.id} title={deck.title} initialCards={cards ?? []} />
        </section>
      </div>
    </main>
  );
}
