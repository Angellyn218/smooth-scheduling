CREATE TYPE "public"."event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_transparency" AS ENUM('opaque', 'transparent');--> statement-breakpoint
CREATE TYPE "public"."replan_trigger" AS ENUM('task_change', 'google_webhook', 'cron', 'manual');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('needsAction', 'declined', 'tentative', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'done', 'archived');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"google_event_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"title" text,
	"start" timestamp with time zone,
	"end" timestamp with time zone,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"end_date" date,
	"transparency" "event_transparency" DEFAULT 'opaque' NOT NULL,
	"response_status" "response_status",
	"status" "event_status" DEFAULT 'confirmed' NOT NULL,
	"is_app_managed" boolean DEFAULT false NOT NULL,
	"recurring_event_id" text,
	"google_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_time_shape" CHECK (("calendar_events"."is_all_day" and "calendar_events"."start_date" is not null and "calendar_events"."end_date" > "calendar_events"."start_date" and "calendar_events"."start" is null and "calendar_events"."end" is null)
        or (not "calendar_events"."is_all_day" and "calendar_events"."start" is not null and "calendar_events"."end" >= "calendar_events"."start" and "calendar_events"."start_date" is null and "calendar_events"."end_date" is null))
);
--> statement-breakpoint
CREATE TABLE "google_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"sync_token" text,
	"channel_id" text,
	"resource_id" text,
	"channel_token" text,
	"channel_expires_at" timestamp with time zone,
	"last_full_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_sync_state_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "replan_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"trigger" "replan_trigger" NOT NULL,
	"snapshot_before" jsonb NOT NULL,
	"moved_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flagged_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"buffer_minutes" integer DEFAULT 10 NOT NULL,
	"planning_window_days" integer DEFAULT 7 NOT NULL,
	"min_chunk_minutes" integer DEFAULT 15 NOT NULL,
	"blocking_calendar_ids" text[] DEFAULT '{primary}'::text[] NOT NULL,
	"available_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_buffer_nonnegative" CHECK ("user_settings"."buffer_minutes" >= 0),
	CONSTRAINT "user_settings_window_positive" CHECK ("user_settings"."planning_window_days" > 0),
	CONSTRAINT "user_settings_min_chunk_positive" CHECK ("user_settings"."min_chunk_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "scheduled_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"part_index" smallint DEFAULT 1 NOT NULL,
	"part_count" smallint DEFAULT 1 NOT NULL,
	"google_event_id" text,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_error" text,
	"replan_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_blocks_end_after_start" CHECK ("scheduled_blocks"."end" > "scheduled_blocks"."start"),
	CONSTRAINT "scheduled_blocks_part_range" CHECK ("scheduled_blocks"."part_index" between 1 and "scheduled_blocks"."part_count")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"duration_minutes" integer NOT NULL,
	"priority" smallint DEFAULT 3 NOT NULL,
	"deadline" timestamp with time zone,
	"remaining_minutes" integer NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"completed_at" timestamp with time zone,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_start" timestamp with time zone,
	"locked_end" timestamp with time zone,
	"splittable" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"recurrence_rule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_duration_positive" CHECK ("tasks"."duration_minutes" > 0),
	CONSTRAINT "tasks_priority_range" CHECK ("tasks"."priority" between 1 and 5),
	CONSTRAINT "tasks_remaining_range" CHECK ("tasks"."remaining_minutes" between 0 and "tasks"."duration_minutes"),
	CONSTRAINT "tasks_done_has_completed_at" CHECK ("tasks"."status" <> 'done' or "tasks"."completed_at" is not null),
	CONSTRAINT "tasks_lock_has_range" CHECK (not "tasks"."is_locked" or ("tasks"."locked_start" is not null and "tasks"."locked_end" > "tasks"."locked_start"))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_sync_state" ADD CONSTRAINT "google_sync_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replan_runs" ADD CONSTRAINT "replan_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_blocks" ADD CONSTRAINT "scheduled_blocks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_blocks" ADD CONSTRAINT "scheduled_blocks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_blocks" ADD CONSTRAINT "scheduled_blocks_replan_run_id_replan_runs_id_fk" FOREIGN KEY ("replan_run_id") REFERENCES "public"."replan_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_google_idx" ON "calendar_events" USING btree ("user_id","calendar_id","google_event_id");--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_idx" ON "calendar_events" USING btree ("user_id","start");--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_date_idx" ON "calendar_events" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "google_sync_state_user_calendar_idx" ON "google_sync_state" USING btree ("user_id","calendar_id");--> statement-breakpoint
CREATE INDEX "google_sync_state_channel_expires_idx" ON "google_sync_state" USING btree ("channel_expires_at");--> statement-breakpoint
CREATE INDEX "replan_runs_user_created_idx" ON "replan_runs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scheduled_blocks_user_start_idx" ON "scheduled_blocks" USING btree ("user_id","start");--> statement-breakpoint
CREATE INDEX "scheduled_blocks_task_idx" ON "scheduled_blocks" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_blocks_google_event_idx" ON "scheduled_blocks" USING btree ("user_id","google_event_id") WHERE "scheduled_blocks"."google_event_id" is not null;--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status") WHERE "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_user_deadline_idx" ON "tasks" USING btree ("user_id","deadline");