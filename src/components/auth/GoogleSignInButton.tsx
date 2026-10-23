"use client";

import { useState, type ReactNode } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";

// Minimal typing for the Google Identity Services code client.
type CodeClient = { requestCode(): void };
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (response: { code?: string; error?: string }) => void;
            error_callback?: (error: { type: string }) => void;
          }): CodeClient;
        };
      };
    };
  }
}

/**
 * Our own button driving Google's popup (GIS code client). The code goes to
 * /auth/google, which signs in with Supabase server-side. Google never
 * redirects through <ref>.supabase.co, so its account chooser names this site,
 * and the button keeps the app's styling (Google's rendered button cannot).
 */
export function GoogleSignInButton({
  clientId,
  next,
  onError,
  children,
}: {
  clientId: string;
  next: string;
  onError: (message: string | null) => void;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  const signIn = () => {
    const oauth2 = window.google?.accounts.oauth2;
    if (!oauth2) return onError("Google sign-in is still loading. Try again in a moment.");
    onError(null);
    oauth2
      .initCodeClient({
        client_id: clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: async ({ code, error }) => {
          if (!code) return onError(error === "access_denied" ? null : "Google sign-in was cancelled.");
          setPending(true);
          const res = await fetch("/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (res.ok) return window.location.assign(next);
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setPending(false);
          onError(data.error ?? "Google sign-in failed. Please try again.");
        },
        // Popup closed or blocked: no error to show beyond leaving the page as it was.
        error_callback: ({ type }) => {
          if (type === "popup_failed_to_open") onError("Allow pop-ups for this site to sign in with Google.");
        },
      })
      .requestCode();
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => onError("Could not load Google sign-in. Use the email link instead.")}
      />
      <Button type="button" variant="outline" className="w-full" onClick={signIn} disabled={!ready || pending}>
        {children}
      </Button>
    </>
  );
}
