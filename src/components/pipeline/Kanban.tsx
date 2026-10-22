"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { motion } from "motion/react";
import { hoverLift, springs } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGES } from "@/lib/stages";
import { daysIn } from "@/lib/format";
import { transitionStage } from "@/actions/applications";
import type { ApplicationStage } from "@/db/schema";
import type { PipelineCard } from "@/lib/queries/applications";
import { StageMoveDialog, type PendingMove } from "./StageMoveDialog";
import { STAGE_DOT, STAGE_TONE } from "./constants";

// Moves to interview or closed need extra detail (round / reason), so they go
// through the dialog. Everything else applies optimistically on drop.
const NEEDS_DIALOG = new Set<ApplicationStage>(["interview", "closed"]);

export function Kanban({ cards }: { cards: PipelineCard[] }) {
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [optimistic, applyOptimistic] = useOptimistic(
    cards,
    (state, move: { id: string; to: ApplicationStage }) =>
      state.map((c) => (c.id === move.id ? { ...c, stage: move.to, stageEnteredAt: new Date() } : c)),
  );
  const [, start] = useTransition();
  const [active, setActive] = useState<PipelineCard | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<ApplicationStage, PipelineCard[]>(STAGES.map((s) => [s, []]));
    for (const c of optimistic) {
      if (q && !`${c.title} ${c.company} ${c.location ?? ""}`.toLowerCase().includes(q)) continue;
      map.get(c.stage)!.push(c);
    }
    return map;
  }, [optimistic, query]);
  const closedCount = byStage.get("closed")!.length;
  const visibleStages = showClosed ? STAGES : STAGES.filter((s) => s !== "closed");

  const onDragStart = (e: DragStartEvent) => setActive(optimistic.find((c) => c.id === e.active.id) ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const card = optimistic.find((c) => c.id === e.active.id);
    const to = e.over?.id as ApplicationStage | undefined;
    if (!card || !to || to === card.stage) return;

    if (NEEDS_DIALOG.has(to)) {
      setPendingMove({ id: card.id, title: `${card.title} @ ${card.company}`, from: card.stage, to });
      return;
    }
    start(async () => {
      applyOptimistic({ id: card.id, to });
      const result = await transitionStage({ id: card.id, to });
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by role, company, location" className="pl-8" aria-label="Filter cards" />
        </div>
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
        </button>
      </div>
      {/* Fixed id keeps dnd-kit's generated aria ids identical on server and client (avoids a hydration warning). */}
      <DndContext id="pipeline-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {visibleStages.map((stage) => (
            <Column key={stage} stage={stage} cards={byStage.get(stage)!} />
          ))}
          {!showClosed && (
            <ClosedDropZone count={closedCount} />
          )}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {active ? (
            <motion.div initial={{ scale: 1 }} animate={{ scale: 1.04, rotate: 1.5 }} transition={springs.snappy}>
              <CardBody card={active} dragging />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <StageMoveDialog move={pendingMove} onClose={() => setPendingMove(null)} />
    </>
  );
}

/** Collapsed "Closed" target so a card can still be dropped there while the column is hidden. */
function ClosedDropZone({ count }: { count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "closed" });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-12 shrink-0 flex-col items-center rounded-card border border-dashed border-glass-border bg-glass py-3 text-xs text-muted-foreground transition-colors",
        isOver && "border-primary bg-primary/5 text-foreground",
      )}
      title="Drop here to close"
    >
      <span className={cn("rounded-md px-1.5 py-0.5 font-semibold [writing-mode:vertical-rl] rotate-180", STAGE_TONE.closed)}>Closed · {count}</span>
    </section>
  );
}

function Column({ stage, cards }: { stage: ApplicationStage; cards: PipelineCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "glass-static flex min-w-[13.5rem] flex-1 basis-0 shrink-0 flex-col rounded-card border transition-colors [contain:paint]",
        isOver && "border-primary ring-2 ring-primary/30",
      )}
    >
      <header className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", STAGE_DOT[stage])} />
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STAGE_TONE[stage])}>{STAGE_LABEL[stage]}</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground tabular">{cards.length}</span>
      </header>
      <div className="flex-1 min-h-24 space-y-2 p-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && <p className="rounded-xl border border-dashed border-glass-border px-2 py-6 text-center text-xs text-muted-foreground">Drop here</p>}
      </div>
    </section>
  );
}

function DraggableCard({ card }: { card: PipelineCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-30")}>
      <CardBody card={card} />
    </div>
  );
}

function CardBody({ card, dragging }: { card: PipelineCard; dragging?: boolean }) {
  const days = daysIn(card.stageEnteredAt);
  const stale = card.stage !== "closed" && days >= 10;
  return (
    <motion.div
      {...(dragging ? {} : hoverLift)}
      className={cn(
        "rounded-xl border border-glass-border bg-card p-3 shadow-card cursor-grab active:cursor-grabbing",
        dragging && "shadow-lift",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/applications/${card.id}`}
          className="font-medium text-sm leading-snug hover:underline line-clamp-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {card.title}
        </Link>
        {card.priority <= 2 && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            P{card.priority}
          </Badge>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground truncate">{card.company}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{[card.location, card.workMode].filter(Boolean).join(" · ")}</span>
        <span className={cn("tabular", stale && "font-semibold text-stage-screening-fg")}>{days}d</span>
      </div>
    </motion.div>
  );
}
