import { Pencil, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/common/DeleteButton";
import { deleteNote } from "@/actions/notes";
import { timeAgo } from "@/lib/format";
import type { Note } from "@/db/schema";
import { NoteDialog } from "./NoteDialog";
import { NOTE_KIND_OPTIONS } from "./constants";

const KIND_LABEL = Object.fromEntries(NOTE_KIND_OPTIONS.map((o) => [o.value, o.label])) as Record<Note["kind"], string>;

export function NotesPanel({
  notes,
  applicationId,
  companyId,
}: {
  notes: Note[];
  applicationId?: string | null;
  companyId?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Prep before, reflect after. Rejection learnings feed the journey review.
        </p>
        <div className="flex gap-2">
          <NoteDialog applicationId={applicationId} companyId={companyId} defaultKind="prep" trigger={<Button size="sm" variant="outline">Prep note</Button>} />
          <NoteDialog applicationId={applicationId} companyId={companyId} defaultKind="reflection" trigger={<Button size="sm" variant="outline">Reflection</Button>} />
          <NoteDialog applicationId={applicationId} companyId={companyId} />
        </div>
      </div>
      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <StickyNote className="mx-auto mb-2 h-6 w-6" />
            No notes yet.
          </CardContent>
        </Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{KIND_LABEL[n.kind]}</Badge>
                    <h3 className="font-medium">{n.title}</h3>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.updatedAt)}</span>
                  </div>
                  {n.bodyMd && <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{n.bodyMd}</p>}
                  {n.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <NoteDialog note={n} trigger={<Button variant="ghost" size="icon" aria-label="Edit note"><Pencil className="h-4 w-4" /></Button>} />
                  <DeleteButton id={n.id} action={deleteNote} label="note" size="icon" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
