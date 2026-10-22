import { requireUser, getProfile } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, email } = await requireUser();
  const profile = await getProfile(userId);
  return <AppShell user={{ email, name: profile.displayName }}>{children}</AppShell>;
}
