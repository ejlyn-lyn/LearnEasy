import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnglishClient from "./EnglishClient";

export default async function EnglishPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: vocabulary } = await supabase
    .from("vocabulary")
    .select("id, term, translation, source, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const { data: decks } = await supabase
    .from("flashcard_decks")
    .select("id, title, source_type, folder_name, card_count")
    .eq("owner_id", user.id)
    .eq("source_type", "english")
    .order("created_at", { ascending: false });

  return <EnglishClient initialVocabulary={vocabulary ?? []} initialDecks={decks ?? []} />;
}
