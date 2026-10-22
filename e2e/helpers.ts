import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

/**
 * Signs a Playwright page in without email: the service-role admin API mints
 * a magic link, and visiting its action link completes the PKCE/OTP flow via
 * /auth/callback exactly as a real click would.
 */
export async function signIn(page: Page, email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.E2E_BASE_URL ?? "http://localhost:3000"}/auth/callback` },
  });
  if (error) throw error;

  // generateLink returns an already-hashed token; for a brand-new user GoTrue
  // files it as a signup/email OTP, so type=email is what verifyOtp accepts.
  // It goes to our token-hash confirm
  // route (verifyOtp), not to /auth/v1/verify?token= which would hash it again.
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  await page.goto(`${base}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${data.properties.verification_type}&next=/today`);
  await page.waitForURL(/\/today/);
}

export const uniqueEmail = () => `e2e+${Date.now()}@example.com`;
