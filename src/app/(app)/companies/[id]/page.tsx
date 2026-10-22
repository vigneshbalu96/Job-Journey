import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ExternalLink, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCompany } from "@/lib/queries/companies";
import { listContacts } from "@/lib/queries/contacts";
import { listNotes } from "@/lib/queries/notes";
import { listCompanies } from "@/lib/queries/applications";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyDialog } from "@/components/companies/CompanyDialog";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteCompany } from "@/actions/companies";
import { shortDate } from "@/lib/format";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser();
  const data = await getCompany(userId, id);
  if (!data) notFound();
  const { company, roles } = data;
  const [contacts, notes, companies] = await Promise.all([
    listContacts(userId, { companyId: id }),
    listNotes(userId, { companyId: id }),
    listCompanies(userId),
  ]);

  return (
    <>
      <PageHeader
        icon={Building2}
        title={company.name}
        subtitle={[company.industry, company.size, company.hqLocation].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {company.website && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={company.website} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="h-4 w-4" /> Website
              </Button>
            )}
            <CompanyDialog
              company={company}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              }
            />
            <DeleteButton
              id={company.id}
              action={deleteCompany}
              label="company"
              redirectTo="/companies"
              warning="Roles and applications under it stay in your history but the company disappears from lists."
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Roles ({roles.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles yet. Add one from the pipeline.</p>}
            {roles.map(({ role: r, applicationId, stage }) => {
              const body = (
                <>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[r.location, r.workMode, r.roleType].filter(Boolean).join(" · ") || "—"}
                      {r.postedAt ? ` · posted ${shortDate(r.postedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {stage && <StageBadge stage={stage} />}
                    <Badge variant="outline">{r.source.replace("_", " ")}</Badge>
                  </div>
                </>
              );
              return applicationId ? (
                <Link key={r.id} href={`/applications/${applicationId}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-muted">
                  {body}
                </Link>
              ) : (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  {body}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">People ({contacts.length})</CardTitle>
            <ContactDialog companies={companies} defaultCompanyId={company.id} trigger={<Button size="sm" variant="outline">Add</Button>} />
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
            {contacts.map((p) => (
              <Link key={p.id} href={`/contacts/${p.id}`} className="block rounded-lg border px-3 py-2 hover:bg-muted">
                <p className="font-medium truncate">{p.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{[p.title, p.relationship].filter(Boolean).join(" · ") || "—"}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <h2 className="mb-3 text-base font-semibold">Notes</h2>
          <NotesPanel notes={notes} companyId={company.id} />
        </div>

        {company.notes && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
