import Link from "next/link";
import { HelpCircle, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listQuestionTags, listQuestions } from "@/lib/queries/notes";
import { listCompanies } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionDialog } from "@/components/questions/QuestionDialog";
import { AskedAgainButton } from "@/components/questions/AskedAgainButton";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteQuestion } from "@/actions/notes";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Question bank" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const { userId } = await requireUser();
  const [rows, tags, companies] = await Promise.all([listQuestions(userId, { tag }), listQuestionTags(userId), listCompanies(userId)]);

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title="Question bank"
        subtitle="Questions you have been asked, the answers you want to give, and how often each comes up."
        actions={<QuestionDialog companies={companies} />}
      />
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link href="/questions"><Badge variant={tag ? "outline" : "default"}>all</Badge></Link>
          {tags.map((t) => (
            <Link key={t.tag} href={`/questions?tag=${encodeURIComponent(t.tag)}`}>
              <Badge variant={tag === t.tag ? "default" : "outline"}>{t.tag} · {t.n}</Badge>
            </Link>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={HelpCircle} title={tag ? `Nothing tagged "${tag}"` : "No questions yet"} description="After each interview, add the questions while they are fresh." />
      ) : (
        <div className="space-y-3">
          {rows.map(({ question: q, company, roleTitle }) => (
            <Card key={q.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{q.prompt}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {q.difficulty && <span className={cn("rounded px-1.5 py-0.5 font-medium", q.difficulty >= 4 ? "bg-tone-high-soft text-tone-high-fg" : q.difficulty === 3 ? "bg-tone-mid-soft text-tone-mid-fg" : "bg-tone-low-soft text-tone-low-fg")}>D{q.difficulty}</span>}
                      {q.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                      {(company || roleTitle) && <span>· {[roleTitle, company].filter(Boolean).join(" @ ")}</span>}
                      <span>· asked {q.askedCount}×{q.lastAskedAt ? `, last ${timeAgo(q.lastAskedAt)}` : ""}</span>
                    </div>
                    {q.answerMd && (
                      <details className="mt-3 group">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Show answer</summary>
                        <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{q.answerMd}</p>
                      </details>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AskedAgainButton id={q.id} />
                    <QuestionDialog question={q} companies={companies} trigger={<Button variant="ghost" size="icon" aria-label="Edit question"><Pencil className="h-4 w-4" /></Button>} />
                    <DeleteButton id={q.id} action={deleteQuestion} label="question" size="icon" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
