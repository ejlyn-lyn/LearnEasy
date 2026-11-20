"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ThemeApplier() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("theme, accent")
        .eq("id", user.id)
        .maybeSingle();
      document.documentElement.dataset.theme = profile?.theme ?? "dark";
      document.documentElement.dataset.accent = profile?.accent ?? "violet";
    });
  }, []);

  return null;
}
