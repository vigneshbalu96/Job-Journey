import { Settings } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { monthlyAiSpend } from "@/lib/ai/client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId, email } = await requireUser();
  const [profile, spend] = await Promise.all([getProfile(userId), monthlyAiSpend(userId)]);
  return (
    <>
      <PageHeader icon={Settings} title="Settings" subtitle={`Signed in as ${email} · AI this month: ${spend.runs} runs (free tier)`} />
      <ProfileForm profile={profile} />
    </>
  );
}
