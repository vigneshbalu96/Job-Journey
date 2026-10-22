import { Download, FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listDocuments } from "@/lib/queries/documents";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteDocument } from "@/actions/documents";
import { shortDate } from "@/lib/format";
import type { Document } from "@/db/schema";

export const metadata = { title: "Documents" };

function groupByName(rows: { doc: Document; usedBy: number }[]) {
  const map = new Map<string, { doc: Document; usedBy: number }[]>();
  for (const r of rows) {
    const key = `${r.doc.kind}::${r.doc.name}`;
    (map.get(key) ?? map.set(key, []).get(key)!).push(r);
  }
  return Array.from(map.values());
}

export default async function DocumentsPage() {
  const { userId } = await requireUser();
  const rows = await listDocuments(userId);
  const groups = groupByName(rows);

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Documents"
        subtitle="Resume and cover-letter versions. Attach a version to each application so you know what they saw."
        actions={<UploadDialog />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload your current resume to start versioning it." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((versions) => {
            const latest = versions[0].doc;
            return (
              <Card key={latest.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{latest.name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{latest.kind.replace("_", " ")} · {versions.length} version{versions.length === 1 ? "" : "s"}</p>
                  </div>
                  <UploadDialog parent={latest} trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New version</Button>} />
                </CardHeader>
                <CardContent className="space-y-2">
                  {versions.map(({ doc, usedBy }) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          v{doc.version} <span className="text-muted-foreground font-normal">· {shortDate(doc.createdAt)} · {(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                        </p>
                        {doc.notes && <p className="text-xs text-muted-foreground truncate">{doc.notes}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {usedBy > 0 && <Badge variant="secondary">{usedBy} app{usedBy === 1 ? "" : "s"}</Badge>}
                        <Button size="icon" variant="ghost" aria-label="Download" nativeButton={false} render={<a href={`/api/documents/${doc.id}/download`} />}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <DeleteButton id={doc.id} action={deleteDocument} label="document version" size="icon" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
