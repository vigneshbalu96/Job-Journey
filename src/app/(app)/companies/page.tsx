import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listCompaniesWithCounts } from "@/lib/queries/companies";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { CompanyDialog } from "@/components/companies/CompanyDialog";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const { userId } = await requireUser();
  const rows = await listCompaniesWithCounts(userId);

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Companies"
        subtitle="Every company you are talking to, with roles and people."
        actions={<CompanyDialog />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" description="Add one here, or create it inline when you add an application." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <SpotlightCard className="h-full transition-transform hover:-translate-y-0.5">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-sm font-bold text-primary dark:bg-primary/15">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {([c.industry, c.hqLocation].filter(Boolean).join(" · ") || c.domain) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.industry, c.hqLocation].filter(Boolean).join(" · ") || c.domain}
                        </p>
                      )}
                      </div>
                    </div>
                    <Badge className={c.openApplications ? "bg-stage-applied-soft text-stage-applied-fg" : "bg-muted text-muted-foreground"}>{c.openApplications} open</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.roles} role{c.roles === 1 ? "" : "s"} · {c.contacts} contact{c.contacts === 1 ? "" : "s"}
                  </p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
