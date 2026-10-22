import { Link2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listCompanies } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { ClipForm } from "@/components/clip/ClipForm";

export const metadata = { title: "Clip a job" };

export default async function ClipPage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string }> }) {
  const { url, text } = await searchParams;
  const { userId } = await requireUser();
  const companies = await listCompanies(userId);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookmarklet = `javascript:(function(){var s=document.createElement('script');s.src='${origin}/api/clip/bookmarklet?'+Date.now();document.body.appendChild(s);})();`;
  return (
    <>
      <PageHeader icon={Link2} title="Clip a job" subtitle="Turn a posting into a prefilled application in one step." />
      <ClipForm companies={companies} initialUrl={url} initialText={text} bookmarklet={bookmarklet} />
    </>
  );
}
