import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------- enums

export const applicationStageEnum = pgEnum("application_stage", [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "closed",
]);
export const closeReasonEnum = pgEnum("close_reason", ["accepted", "rejected", "withdrawn", "ghosted"]);
export const applicationSourceEnum = pgEnum("application_source", [
  "referral",
  "linkedin",
  "company_site",
  "recruiter",
  "job_board",
  "other",
]);
export const roleTypeEnum = pgEnum("role_type", ["fulltime", "contract", "freelance", "internship"]);
export const workModeEnum = pgEnum("work_mode", ["remote", "hybrid", "onsite"]);
export const interactionKindEnum = pgEnum("interaction_kind", [
  "email",
  "call",
  "linkedin",
  "meeting",
  "interview",
  "other",
]);
export const interactionDirectionEnum = pgEnum("interaction_direction", ["in", "out"]);
export const noteKindEnum = pgEnum("note_kind", ["prep", "reflection", "rejection_learning", "general"]);
export const taskKindEnum = pgEnum("task_kind", ["follow_up", "interview", "deadline", "apply", "custom"]);
export const documentKindEnum = pgEnum("document_kind", ["resume", "cover_letter"]);
export const offerStatusEnum = pgEnum("offer_status", ["received", "negotiating", "accepted", "declined"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "restore"]);
export const aiTaskEnum = pgEnum("ai_task", [
  "clip_extract",
  "jd_parse",
  "fit_score",
  "resume_bullets",
  "cover_letter",
  "interview_questions",
  "follow_up_email",
]);
export const aiRunStatusEnum = pgEnum("ai_run_status", ["ok", "error", "refused"]);

export type ApplicationStage = (typeof applicationStageEnum.enumValues)[number];
export type CloseReason = (typeof closeReasonEnum.enumValues)[number];
export type AiTask = (typeof aiTaskEnum.enumValues)[number];

// ------------------------------------------------------- shared columns
// Every user-owned table carries these. deletedAt is the soft-delete marker:
// nothing is ever hard-deleted, and every read goes through scoped() which
// filters `deleted_at IS NULL`.

const tz = (name: string) => timestamp(name, { withTimezone: true });

const timestamps = {
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: tz("deleted_at"),
};

const owned = {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ...timestamps,
};

const notDeleted = sql`deleted_at is null`;

// --------------------------------------------------------------- tables

/** One row per auth user, created lazily on first authenticated request. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  digestHour: smallint("digest_hour").notNull().default(8),
  digestEnabled: boolean("digest_enabled").notNull().default(true),
  /** Applications to send per week; powers the Today ring and the digest line. */
  weeklyTarget: smallint("weekly_target").notNull().default(5),
  /** Free-text "about me": skills, experience, preferences. The AI scores JDs against this. */
  masterProfile: text("master_profile"),
  targetRoles: text("target_roles").array().notNull().default(sql`'{}'::text[]`),
  targetLocations: text("target_locations").array().notNull().default(sql`'{}'::text[]`),
  /** Days after entering a stage before an automatic follow-up task is due. */
  followUpDays: jsonb("follow_up_days")
    .$type<Partial<Record<ApplicationStage, number>>>()
    .notNull()
    .default({ applied: 7, screening: 5, interview: 3, offer: 2 }),
  ...timestamps,
});

export const companies = pgTable(
  "companies",
  {
    ...owned,
    name: text("name").notNull(),
    website: text("website"),
    domain: text("domain"),
    industry: text("industry"),
    size: text("size"),
    hqLocation: text("hq_location"),
    linkedinUrl: text("linkedin_url"),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("companies_user_name_uq").on(t.userId, sql`lower(${t.name})`).where(notDeleted),
    index("companies_user_idx").on(t.userId, t.updatedAt),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    ...owned,
    companyId: uuid("company_id").references(() => companies.id),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    title: text("title"),
    /** recruiter, hiring manager, referrer, peer, alumni, ... */
    relationship: text("relationship"),
    referredByContactId: uuid("referred_by_contact_id").references((): AnyPgColumn => contacts.id),
    lastTouchAt: tz("last_touch_at"),
    nextFollowUpAt: tz("next_follow_up_at"),
    notes: text("notes"),
  },
  (t) => [
    index("contacts_user_company_idx").on(t.userId, t.companyId),
    index("contacts_user_followup_idx").on(t.userId, t.nextFollowUpAt).where(notDeleted),
  ],
);

/** Resume and cover-letter versions. parentId links a version to the one it was derived from. */
export const documents = pgTable(
  "documents",
  {
    ...owned,
    kind: documentKindEnum("kind").notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull().default(1),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => documents.id),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("documents_user_kind_name_version_uq").on(t.userId, t.kind, t.name, t.version).where(notDeleted),
    index("documents_user_kind_idx").on(t.userId, t.kind),
  ],
);

/** A job posting at a company. One role can have at most one live application. */
export const roles = pgTable(
  "roles",
  {
    ...owned,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    title: text("title").notNull(),
    roleType: roleTypeEnum("role_type"),
    workMode: workModeEnum("work_mode"),
    location: text("location"),
    salaryMin: numeric("salary_min", { precision: 14, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 14, scale: 2 }),
    currency: char("currency", { length: 3 }).default("INR"),
    sourceUrl: text("source_url"),
    source: applicationSourceEnum("source").notNull().default("other"),
    jdText: text("jd_text"),
    jdSummary: text("jd_summary"),
    postedAt: tz("posted_at"),
    clippedAt: tz("clipped_at"),
    rawHtmlPath: text("raw_html_path"),
  },
  (t) => [index("roles_user_company_idx").on(t.userId, t.companyId)],
);

export const applications = pgTable(
  "applications",
  {
    ...owned,
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    stage: applicationStageEnum("stage").notNull().default("saved"),
    closeReason: closeReasonEnum("close_reason"),
    /** Denormalised: when the current stage was entered. Time-in-stage = now - this. */
    stageEnteredAt: tz("stage_entered_at").notNull().defaultNow(),
    appliedAt: tz("applied_at"),
    resumeDocumentId: uuid("resume_document_id").references(() => documents.id),
    coverLetterDocumentId: uuid("cover_letter_document_id").references(() => documents.id),
    referredByContactId: uuid("referred_by_contact_id").references(() => contacts.id),
    /** 1 = top priority, 5 = low. */
    priority: smallint("priority").notNull().default(3),
    fitScore: smallint("fit_score"),
    fitRationale: text("fit_rationale"),
  },
  (t) => [
    uniqueIndex("applications_user_role_uq").on(t.userId, t.roleId).where(notDeleted),
    index("applications_user_stage_idx").on(t.userId, t.stage).where(notDeleted),
    index("applications_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

/** Insert-only history of stage transitions; the journey timeline is built from these. */
export const applicationStageEvents = pgTable(
  "application_stage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    fromStage: applicationStageEnum("from_stage"),
    toStage: applicationStageEnum("to_stage").notNull(),
    closeReason: closeReasonEnum("close_reason"),
    /** e.g. "Round 2 – system design". Lets several events share the interview stage. */
    roundLabel: text("round_label"),
    occurredAt: tz("occurred_at").notNull().defaultNow(),
    note: text("note"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("stage_events_application_idx").on(t.applicationId, t.occurredAt),
    index("stage_events_user_occurred_idx").on(t.userId, t.occurredAt),
  ],
);

export const interactions = pgTable(
  "interactions",
  {
    ...owned,
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    applicationId: uuid("application_id").references(() => applications.id),
    kind: interactionKindEnum("kind").notNull(),
    direction: interactionDirectionEnum("direction").notNull().default("out"),
    occurredAt: tz("occurred_at").notNull().defaultNow(),
    summary: text("summary").notNull(),
  },
  (t) => [
    index("interactions_contact_idx").on(t.contactId, t.occurredAt),
    index("interactions_user_occurred_idx").on(t.userId, t.occurredAt),
  ],
);

/** Prep notes, post-interview reflections, rejection learnings, general notes. */
export const notes = pgTable(
  "notes",
  {
    ...owned,
    kind: noteKindEnum("kind").notNull().default("general"),
    companyId: uuid("company_id").references(() => companies.id),
    applicationId: uuid("application_id").references(() => applications.id),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [
    index("notes_user_application_idx").on(t.userId, t.applicationId),
    index("notes_user_company_idx").on(t.userId, t.companyId),
  ],
);

export const questions = pgTable(
  "questions",
  {
    ...owned,
    prompt: text("prompt").notNull(),
    answerMd: text("answer_md"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** 1 easy … 5 hard */
    difficulty: smallint("difficulty"),
    companyId: uuid("company_id").references(() => companies.id),
    applicationId: uuid("application_id").references(() => applications.id),
    askedCount: integer("asked_count").notNull().default(0),
    lastAskedAt: tz("last_asked_at"),
  },
  (t) => [
    index("questions_user_idx").on(t.userId, t.updatedAt),
    index("questions_tags_gin").using("gin", t.tags),
  ],
);

export const offers = pgTable(
  "offers",
  {
    ...owned,
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    baseAnnual: numeric("base_annual", { precision: 14, scale: 2 }),
    variableAnnual: numeric("variable_annual", { precision: 14, scale: 2 }),
    equityDescription: text("equity_description"),
    equityValueAnnual: numeric("equity_value_annual", { precision: 14, scale: 2 }),
    signOn: numeric("sign_on", { precision: 14, scale: 2 }),
    ctcTotal: numeric("ctc_total", { precision: 14, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    location: text("location"),
    workMode: workModeEnum("work_mode"),
    noticePeriodDays: integer("notice_period_days"),
    joiningDate: date("joining_date"),
    deadlineAt: tz("deadline_at"),
    decisionNotes: text("decision_notes"),
    status: offerStatusEnum("status").notNull().default("received"),
  },
  (t) => [uniqueIndex("offers_application_uq").on(t.applicationId).where(notDeleted)],
);

/** Reminders, interview slots, deadlines. Backs the Today view and the digest. */
export const tasks = pgTable(
  "tasks",
  {
    ...owned,
    kind: taskKindEnum("kind").notNull().default("custom"),
    title: text("title").notNull(),
    dueAt: tz("due_at").notNull(),
    completedAt: tz("completed_at"),
    snoozedUntil: tz("snoozed_until"),
    applicationId: uuid("application_id").references(() => applications.id),
    contactId: uuid("contact_id").references(() => contacts.id),
  },
  (t) => [
    index("tasks_user_due_open_idx")
      .on(t.userId, t.dueAt)
      .where(sql`completed_at is null and deleted_at is null`),
  ],
);

/**
 * Insert-only paper trail. Every create/update/delete/restore on an owned
 * table writes one row via repo.ts. before/after hold only the changed columns.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").notNull(),
    tableName: text("table_name").notNull(),
    rowId: uuid("row_id").notNull(),
    action: auditActionEnum("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: tz("at").notNull().defaultNow(),
  },
  (t) => [index("audit_user_at_idx").on(t.userId, t.at), index("audit_row_idx").on(t.tableName, t.rowId)],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    task: aiTaskEnum("task").notNull(),
    model: text("model").notNull(),
    applicationId: uuid("application_id").references(() => applications.id),
    roleId: uuid("role_id").references(() => roles.id),
    inputHash: text("input_hash").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    durationMs: integer("duration_ms").notNull().default(0),
    status: aiRunStatusEnum("status").notNull(),
    output: jsonb("output"),
    error: text("error"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_runs_user_created_idx").on(t.userId, t.createdAt), index("ai_runs_hash_idx").on(t.inputHash)],
);

/** One row per user per day the digest was sent — makes the cron idempotent on retry. */
export const digestSends = pgTable(
  "digest_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sentForDate: date("sent_for_date").notNull(),
    resendMessageId: text("resend_message_id"),
    status: text("status").notNull().default("sent"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("digest_sends_user_date_uq").on(t.userId, t.sentForDate)],
);

// ---------------------------------------------------------------- types

export type Profile = typeof profiles.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationStageEvent = typeof applicationStageEvents.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
