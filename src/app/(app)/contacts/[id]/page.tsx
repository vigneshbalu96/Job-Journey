import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Link2, Mail, Pencil, Phone, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getContact } from "@/lib/queries/contacts";
import { listCompanies } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { InteractionDialog } from "@/components/contacts/InteractionDialog";
import { DeleteButton } from "@/components/common/DeleteButton";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { deleteContact } from "@/actions/contacts";
import { dateTime, shortDate, timeAgo } from "@/lib/format";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  const [data, companies] = await Promise.all([getContact(userId, id), listCompanies(userId)]);
  if (!data) notFound();
  const { contact, company, interactions, applications, referrer } = data;
  const overdue = contact.nextFollowUpAt && new Date(contact.nextFollowUpAt) < new Date();

  return (
    <>
      <PageHeader
        icon={Users}
        title={contact.fullName}
        subtitle={[contact.title, contact.relationship].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <InteractionDialog contactId={contact.id} contactName={contact.fullName} />
            <ContactDialog companies={companies} contact={contact} trigger={<Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>} />
            <DeleteButton id={contact.id} action={deleteContact} label="contact" redirectTo="/contacts" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Interactions ({interactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet. Log the first message or call.</p>
            ) : (
              <ol className="relative border-l pl-5 space-y-5">
                {interactions.map((i) => (
                  <li key={i.id} className="relative">
                    <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {i.direction === "out" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      <span className="capitalize font-medium text-foreground">{i.kind}</span>
                      <span>{dateTime(i.occurredAt)}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{i.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {company && (
                <p>
                  <Link href={`/companies/${company.id}`} className="font-medium hover:underline">{company.name}</Link>
                </p>
              )}
              {contact.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></p>}
              {contact.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a></p>}
              {contact.linkedinUrl && <p className="flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" /><a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">LinkedIn profile</a></p>}
              {referrer && <p className="text-muted-foreground">Introduced by <Link href={`/contacts/${referrer.id}`} className="text-foreground hover:underline">{referrer.fullName}</Link></p>}
              <div className="pt-2 border-t grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Last touch</p>
                  <p>{timeAgo(contact.lastTouchAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next follow-up</p>
                  <p className={overdue ? "text-destructive font-medium" : undefined}>{shortDate(contact.nextFollowUpAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {applications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applications here</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.map((a) => (
                  <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-muted">
                    <span className="text-sm font-medium truncate">{a.title}</span>
                    <StageBadge stage={a.stage} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
          <Badge variant="outline" className="hidden" />
        </div>
      </div>
    </>
  );
}
