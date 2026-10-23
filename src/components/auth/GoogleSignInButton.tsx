"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTheme } from "next-themes";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Minimal typing for Google Identity Services (https://accounts.google.com/gsi/client).
type GoogleId = {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce: string;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google's own button. The browser receives the Google ID token and hands it
 * to Supabase with signInWithIdToken, so Google never redirects through
 * <ref>.supabase.co and its account chooser names this site instead.
 * Supabase checks the token's audience against the client ID configured on
 * its Google provider, and the hashed nonce against the raw one we send.
 */
export function GoogleSignInButton({
  clientId,
  next,
  onError,
}: {
  clientId: string;
  next: string;
  onError: (message: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const el = container.current;
    const gsi = window.google?.accounts.id;
    if (!scriptReady || !el || !gsi) return;
    let cancelled = false;

    (async () => {
      const rawNonce = crypto.randomUUID();
      const hashedNonce = await sha256Hex(rawNonce);
      if (cancelled) return;
      gsi.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        use_fedcm_for_button: true,
        callback: async ({ credential }) => {
          onError(null);
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: rawNonce });
          if (error) onError(error.message);
          else window.location.assign(next);
        },
      });
      el.replaceChildren();
      gsi.renderButton(el, {
        type: "standard",
        theme: resolvedTheme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        width: Math.min(400, Math.max(200, Math.floor(el.clientWidth))),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, clientId, next, onError, resolvedTheme]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => onError("Could not load Google sign-in. Use the email link instead.")}
      />
      <div ref={container} className="flex min-h-10 w-full justify-center" />
    </>
  );
}
