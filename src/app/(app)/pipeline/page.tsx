import { Briefcase, Columns3, List } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listCompanies, listPipeline } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { Kanban } from "@/components/pipeline/Kanban";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { ApplicationDialog } from "@/components/pipeline/ApplicationDialog";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const { userId } = await requireUser();
  const [cards, companies] = await Promise.all([listPipeline(userId), listCompanies(userId)]);
  const table = view === "table";

  return (
    <>
      <PageHeader
        icon={Briefcase}
        title="Pipeline"
        subtitle="Drag cards between stages. Every move is recorded in the application's history."
        actions={
          <>
            <SegmentedControl
              id="pipeline-view"
              value={table ? "table" : "board"}
              segments={[
                { value: "board", href: "/pipeline", label: <><Columns3 className="h-4 w-4" /> Board</> },
                { value: "table", href: "/pipeline?view=table", label: <><List className="h-4 w-4" /> Table</> },
              ]}
            />
            <ApplicationDialog companies={companies} />
          </>
        }
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nothing in the pipeline yet"
          description="Add the first role you are considering. Saved roles count too; they are the top of the funnel."
        />
      ) : table ? (
        <PipelineTable cards={cards} />
      ) : (
        <Kanban cards={cards} />
      )}
    </>
  );
}
