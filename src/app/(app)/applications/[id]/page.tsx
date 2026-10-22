import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, ExternalLink } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth";
import { AiPanel } from "@/components/ai/AiPanel";
import { getApplicationDetail, listCompanies } from "@/lib/queries/applications";
import { listNotes } from "@/lib/queries/notes";
import { listContacts } from "@/lib/queries/contacts";
import { listDocumentOptions } from "@/lib/queries/documents";
import { listTasksForApplication } from "@/lib/queries/tasks";
import { TaskRow } from "@/components/today/TaskRow";
import { TaskDialog } from "@/components/today/TaskDialog";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { AttachDocuments } from "@/components/documents/AttachDocuments";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { StageActions } from "@/components/applications/StageActions";
import { RoleDialog } from "@/components/applications/RoleDialog";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { StageHistory } from "@/components/applications/StageHistory";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteApplication } from "@/actions/applications";
import { daysIn, money, shortDate } from "@/lib/format";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  const data = await getApplicationDetail(userId, id);
  if (!data) notFound();
  const { application: app, role, company, events } = data;
  const [notes, contacts, docOptions, companies, profile, taskLists] = await Promise.all([
    listNotes(userId, { applicationId: id }),
    listContacts(userId, { companyId: company.id }),
    listDocumentOptions(userId),
    listCompanies(userId),
    getProfile(userId),
    listTasksForApplication(userId, id),
  ]);
  const now = Date.now();
  const title = `${role.title} @ ${company.name}`;

  return (
    <>
      <SpotlightCard className="mb-6 px-5 pt-5 pb-4 sm:px-6">
      <PageHeader
        className="mb-4"
        icon={Briefcase}
        title={role.title}
        subtitle={undefined}
        actions={
          <>
            {role.sourceUrl && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={role.sourceUrl} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="h-4 w-4" /> Posting
              </Button>
            )}
            <RoleDialog role={role} />
            <StageActions id={app.id} title={title} stage={app.stage} />
            <DeleteButton id={app.id} action={deleteApplication} label="application" redirectTo="/pipeline" />
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/companies/${company.id}`} className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted/70">
          {company.name}
        </Link>
        <StageBadge stage={app.stage} closeReason={app.closeReason} pop />
        <span className="rounded-full bg-muted px-2.5 py-1 tabular">{daysIn(app.stageEnteredAt)}d in stage</span>
        <span className="rounded-full bg-muted px-2.5 py-1">P{app.priority}</span>
        {app.appliedAt && <span className="rounded-full bg-muted px-2.5 py-1">applied {shortDate(app.appliedAt)}</span>}
      </div>
      </SpotlightCard>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History ({events.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({taskLists.open.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes & prep ({notes.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Job description</CardTitle>
            </CardHeader>
            <CardContent>
              {role.jdText ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{role.jdText}</p>
              ) : (
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>No job description saved yet. The AI tools and the fit score need it.</p>
                  <RoleDialog role={role} trigger={<Button size="sm" variant="outline">Paste the JD</Button>} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Location</dt>
                <dd>{role.location ?? "—"}</dd>
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="capitalize">{role.workMode ?? "—"}</dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="capitalize">{role.roleType ?? "—"}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="capitalize">{role.source.replace("_", " ")}</dd>
                <dt className="text-muted-foreground">Salary</dt>
                <dd>
                  {role.salaryMin || role.salaryMax
                    ? `${money(role.salaryMin, role.currency ?? "INR")} – ${money(role.salaryMax, role.currency ?? "INR")}`
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Posted</dt>
                <dd>{shortDate(role.postedAt)}</dd>
                <dt className="text-muted-foreground">Fit score</dt>
                <dd title={app.fitRationale ?? undefined}>{app.fitScore != null ? `${app.fitScore}/100` : "not scored"}</dd>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <StageHistory events={events} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Follow-ups are scheduled automatically on every stage move. Add interviews and deadlines here.</p>
            <TaskDialog applicationId={app.id} />
          </div>
          {taskLists.open.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nothing pending for this application.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {taskLists.open.map((t) => (
                <TaskRow key={t.id} task={t} tone={new Date(t.dueAt).getTime() < now ? "overdue" : "upcoming"} />
              ))}
            </div>
          )}
          {taskLists.done.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Done ({taskLists.done.length})</summary>
              <div className="mt-2 space-y-2">
                {taskLists.done.map((t) => <TaskRow key={t.id} task={t} tone="done" />)}
              </div>
            </details>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesPanel notes={notes} applicationId={app.id} companyId={company.id} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">People at {company.name}. Log every touch so follow-ups stay honest.</p>
            <ContactDialog companies={companies} defaultCompanyId={company.id} />
          </div>
          {contacts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No contacts at this company yet.</CardContent></Card>
          ) : (
            <ContactsTable rows={contacts} hideCompany />
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <AttachDocuments
                applicationId={app.id}
                options={docOptions}
                resumeDocumentId={app.resumeDocumentId}
                coverLetterDocumentId={app.coverLetterDocumentId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AiPanel applicationId={app.id} hasJd={!!role.jdText?.trim()} hasProfile={!!profile.masterProfile?.trim()} companyName={company.name} />
        </TabsContent>
      </Tabs>
    </>
  );
}
