"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function LoginForm({ local, googleEnabled }: { local: boolean; googleEnabled: boolean }) {
  const params = useSearchParams();
  const rawNext = params.get("next");
  // Same rule as safeNext() in the auth routes: same-site paths only.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/today";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "auth" ? "Sign-in link was invalid or expired." : null);
  const [pending, start] = useTransition();

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  // Redirect flow, used when no client ID is configured (e.g. the local stack).
  const signInWithGoogle = () =>
    start(async () => {
      setError(null);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo() },
      });
      if (error) setError(error.message);
    });

  const sendMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) setError(error.message);
      else setSent(true);
    });
  };

  return (
    <Card className="glass-strong rounded-sheet border shadow-float">
      <CardHeader>
        <CardTitle className="text-section">Sign in</CardTitle>
        <CardDescription>{googleEnabled ? "Use Google, or get a one-time link by email." : "Get a one-time sign-in link by email."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleEnabled && (
          <>
            {GOOGLE_CLIENT_ID ? (
              <GoogleSignInButton clientId={GOOGLE_CLIENT_ID} next={next} onError={setError} />
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={pending}>
                <GoogleMark /> Continue with Google
              </Button>
            )}
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2 relative z-10">or</span>
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
          </>
        )}
        {sent ? (
          <div className="space-y-2 text-sm">
            <p>
              Check <strong>{email}</strong> for a sign-in link.
            </p>
            {local && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Local stack: no real email is sent. Read the link in the local mailbox at{" "}
                <a href="http://127.0.0.1:54324" target="_blank" rel="noreferrer" className="underline">127.0.0.1:54324</a>.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <ShimmerButton type="submit" className="w-full" disabled={pending || !email}>
              <Mail className="h-4 w-4" /> Email me a link
            </ShimmerButton>
          </form>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12S6.6 21.7 12 21.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
