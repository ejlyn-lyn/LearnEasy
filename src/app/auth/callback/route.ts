import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "recovery" ? "recovery" : "email",
    });
    if (!error) {
      return NextResponse.redirect(new URL(type === "recovery" ? "/passwort-zuruecksetzen" : next, origin));
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth");
  if (authError) loginUrl.searchParams.set("reason", authError);
  return NextResponse.redirect(loginUrl);
}
