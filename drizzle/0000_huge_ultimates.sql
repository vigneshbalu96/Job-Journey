CREATE TYPE "public"."ai_run_status" AS ENUM('ok', 'error', 'refused');--> statement-breakpoint
CREATE TYPE "public"."ai_task" AS ENUM('clip_extract', 'jd_parse', 'fit_score', 'resume_bullets', 'cover_letter', 'interview_questions', 'follow_up_email');--> statement-breakpoint
CREATE TYPE "public"."application_source" AS ENUM('referral', 'linkedin', 'company_site', 'recruiter', 'job_board', 'other');--> statement-breakpoint
CREATE TYPE "public"."application_stage" AS ENUM('saved', 'applied', 'screening', 'interview', 'offer', 'closed');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'restore');--> statement-breakpoint
CREATE TYPE "public"."close_reason" AS ENUM('accepted', 'rejected', 'withdrawn', 'ghosted');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('resume', 'cover_letter');--> statement-breakpoint
CREATE TYPE "public"."interaction_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."interaction_kind" AS ENUM('email', 'call', 'linkedin', 'meeting', 'interview', 'other');--> statement-breakpoint
CREATE TYPE "public"."note_kind" AS ENUM('prep', 'reflection', 'rejection_learning', 'general');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('received', 'negotiating', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."role_type" AS ENUM('fulltime', 'contract', 'freelance', 'internship');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('follow_up', 'interview', 'deadline', 'custom');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task" "ai_task" NOT NULL,
	"model" text NOT NULL,
	"application_id" uuid,
	"role_id" uuid,
	"input_hash" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"status" "ai_run_status" NOT NULL,
	"output" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_stage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"from_stage" "application_stage",
	"to_stage" "application_stage" NOT NULL,
	"close_reason" "close_reason",
	"round_label" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"role_id" uuid NOT NULL,
	"stage" "application_stage" DEFAULT 'saved' NOT NULL,
	"close_reason" "close_reason",
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	"resume_document_id" uuid,
	"cover_letter_document_id" uuid,
	"referred_by_contact_id" uuid,
	"priority" smallint DEFAULT 3 NOT NULL,
	"fit_score" smallint,
	"fit_rationale" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"website" text,
	"domain" text,
	"industry" text,
	"size" text,
	"hq_location" text,
	"linkedin_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"company_id" uuid,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"title" text,
	"relationship" text,
	"referred_by_contact_id" uuid,
	"last_touch_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "digest_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_for_date" date NOT NULL,
	"resend_message_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"kind" "document_kind" NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"parent_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"contact_id" uuid NOT NULL,
	"application_id" uuid,
	"kind" "interaction_kind" NOT NULL,
	"direction" "interaction_direction" DEFAULT 'out' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"kind" "note_kind" DEFAULT 'general' NOT NULL,
	"company_id" uuid,
	"application_id" uuid,
	"title" text NOT NULL,
	"body_md" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"application_id" uuid NOT NULL,
	"base_annual" numeric(14, 2),
	"variable_annual" numeric(14, 2),
	"equity_description" text,
	"equity_value_annual" numeric(14, 2),
	"sign_on" numeric(14, 2),
	"ctc_total" numeric(14, 2),
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"location" text,
	"work_mode" "work_mode",
	"notice_period_days" integer,
	"joining_date" date,
	"deadline_at" timestamp with time zone,
	"decision_notes" text,
	"status" "offer_status" DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"digest_hour" smallint DEFAULT 8 NOT NULL,
	"digest_enabled" boolean DEFAULT true NOT NULL,
	"master_profile" text,
	"target_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_locations" text[] DEFAULT '{}'::text[] NOT NULL,
	"follow_up_days" jsonb DEFAULT '{"applied":7,"screening":5,"interview":3,"offer":2}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"prompt" text NOT NULL,
	"answer_md" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulty" smallint,
	"company_id" uuid,
	"application_id" uuid,
	"asked_count" integer DEFAULT 0 NOT NULL,
	"last_asked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"role_type" "role_type",
	"work_mode" "work_mode",
	"location" text,
	"salary_min" numeric(14, 2),
	"salary_max" numeric(14, 2),
	"currency" char(3) DEFAULT 'INR',
	"source_url" text,
	"source" "application_source" DEFAULT 'other' NOT NULL,
	"jd_text" text,
	"jd_summary" text,
	"posted_at" timestamp with time zone,
	"clipped_at" timestamp with time zone,
	"raw_html_path" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"kind" "task_kind" DEFAULT 'custom' NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"application_id" uuid,
	"contact_id" uuid
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_document_id_documents_id_fk" FOREIGN KEY ("resume_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cover_letter_document_id_documents_id_fk" FOREIGN KEY ("cover_letter_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_referred_by_contact_id_contacts_id_fk" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_referred_by_contact_id_contacts_id_fk" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_id_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_user_created_idx" ON "ai_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_hash_idx" ON "ai_runs" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "stage_events_application_idx" ON "application_stage_events" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE INDEX "stage_events_user_occurred_idx" ON "application_stage_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_role_uq" ON "applications" USING btree ("user_id","role_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "applications_user_stage_idx" ON "applications" USING btree ("user_id","stage") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "applications_user_updated_idx" ON "applications" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "audit_user_at_idx" ON "audit_log" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "audit_row_idx" ON "audit_log" USING btree ("table_name","row_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_user_name_uq" ON "companies" USING btree ("user_id",lower("name")) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "companies_user_idx" ON "companies" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "contacts_user_company_idx" ON "contacts" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "contacts_user_followup_idx" ON "contacts" USING btree ("user_id","next_follow_up_at") WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "digest_sends_user_date_uq" ON "digest_sends" USING btree ("user_id","sent_for_date");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_user_kind_name_version_uq" ON "documents" USING btree ("user_id","kind","name","version") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "documents_user_kind_idx" ON "documents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "interactions_contact_idx" ON "interactions" USING btree ("contact_id","occurred_at");--> statement-breakpoint
CREATE INDEX "interactions_user_occurred_idx" ON "interactions" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "notes_user_application_idx" ON "notes" USING btree ("user_id","application_id");--> statement-breakpoint
CREATE INDEX "notes_user_company_idx" ON "notes" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_application_uq" ON "offers" USING btree ("application_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "questions_user_idx" ON "questions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "questions_tags_gin" ON "questions" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "roles_user_company_idx" ON "roles" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "tasks_user_due_open_idx" ON "tasks" USING btree ("user_id","due_at") WHERE completed_at is null and deleted_at is null;