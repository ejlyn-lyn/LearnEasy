"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DeleteKind = "module" | "session" | "deck" | "material" | "vocabulary";

export default function DeleteButton({
  kind,
  id,
  label,
  storagePath,
  redirectTo,
  compact = false,
}: {
  kind: DeleteKind;
  id: string;
  label: string;
  storagePath?: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm(`${label} wirklich löschen?`)) return;
    setDeleting(true);
    const supabase = createClient();

    if (kind === "session") {
      await supabase.from("flashcard_decks").delete().eq("session_id", id);
      await supabase.from("sessions").delete().eq("id", id);
    } else if (kind === "material") {
      if (storagePath) await supabase.storage.from("learnai-materials").remove([storagePath]);
      await supabase.from("materials").delete().eq("id", id);
    } else {
      await supabase.from(
        kind === "module"
          ? "modules"
          : kind === "deck"
            ? "flashcard_decks"
            : "vocabulary",
      ).delete().eq("id", id);
    }

    setDeleting(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <button
      type="button"
      className={compact ? "delete-icon compact" : "delete-icon"}
      onClick={remove}
      disabled={deleting}
      aria-label={`${label} löschen`}
      title={`${label} löschen`}
    >
      {deleting ? "…" : "🗑"}
    </button>
  );
}
