import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({ code: z.string().min(10).max(2048) });

/**
 * Finishes "Continue with Google". The login page opens Google's popup with
 * the GIS code client (redirect_uri "postmessage"), so Google never sends the
 * user through <ref>.supabase.co and its account chooser names this site.
 * Here the one-time code is exchanged for Google's ID token (needs the client
 * secret, so it happens server-side) and handed to Supabase, which verifies it
 * against the client ID on its Google provider and sets the session cookies.
 */
export async function POST(request: NextRequest) {
  // Login CSRF: only accept codes posted by our own pages.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 501 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: parsed.data.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenRes.json().catch(() => ({}))) as { id_token?: string };
  if (!tokenRes.ok || !tokens.id_token) {
    return NextResponse.json({ error: "Google sign-in failed. Please try again." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: tokens.id_token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
