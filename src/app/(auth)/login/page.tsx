import { Suspense } from "react";
import { Compass } from "lucide-react";
import { LoginForm } from "./login-form";
import { AuroraBackground } from "@/components/shell/AuroraBackground";

export const metadata = { title: "Sign in · Job Journey" };

export default function LoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local = /127\.0\.0\.1|localhost/.test(supabaseUrl);
  const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <AuroraBackground />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float">
            <Compass className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-display">Job Journey</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">Map your search from first save to signed offer.</p>
          </div>
        </div>
        <Suspense>
          <LoginForm local={local} googleEnabled={googleEnabled} />
        </Suspense>
      </div>
    </main>
  );
}
