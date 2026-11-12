import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps, utc } from "./columns";
import { syncStatus, taskStatus } from "./enums";
import { replanRuns } from "./replan";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    durationMinutes: integer("duration_minutes").notNull(),
    /** 1 = highest, 5 = lowest (US-12). */
    priority: smallint("priority").notNull().default(3),
    deadline: utc("deadline"),
    /** Minutes still to schedule. Set to durationMinutes on insert. */
    remainingMinutes: integer("remaining_minutes").notNull(),
    status: taskStatus("status").notNull().default("todo"),
    completedAt: utc("completed_at"),
    /** Dragging a task to a time locks it there (US-26). */
    isLocked: boolean("is_locked").notNull().default(false),
    lockedStart: utc("locked_start"),
    lockedEnd: utc("locked_end"),
    /** false for things like an exam or a haircut that can't be chopped up. */
    splittable: boolean("splittable").notNull().default(true),
    /** Soft delete so undo can restore it. */
    deletedAt: utc("deleted_at"),
    /** Manual list order, independent of priority. Fractional so a move updates one row. */
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    /** RRULE; unused until FV-04. */
    recurrenceRule: text("recurrence_rule"),
    ...timestamps(),
  },
  (t) => [
    index("tasks_user_status_idx")
      .on(t.userId, t.status)
      .where(sql`${t.deletedAt} is null`),
    index("tasks_user_deadline_idx").on(t.userId, t.deadline),
    check("tasks_duration_positive", sql`${t.durationMinutes} > 0`),
    check("tasks_priority_range", sql`${t.priority} between 1 and 5`),
    check(
      "tasks_remaining_range",
      sql`${t.remainingMinutes} between 0 and ${t.durationMinutes}`,
    ),
    check(
      "tasks_done_has_completed_at",
      sql`${t.status} <> 'done' or ${t.completedAt} is not null`,
    ),
    check(
      "tasks_lock_has_range",
      sql`not ${t.isLocked} or (${t.lockedStart} is not null and ${t.lockedEnd} > ${t.lockedStart})`,
    ),
  ],
);

export const scheduledBlocks = pgTable(
  "scheduled_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    start: utc("start").notNull(),
    end: utc("end").notNull(),
    /** 1-based; powers "part 2 of 3" (US-09). */
    partIndex: smallint("part_index").notNull().default(1),
    partCount: smallint("part_count").notNull().default(1),
    /** The Google event this app wrote for the block (US-24). */
    googleEventId: text("google_event_id"),
    syncStatus: syncStatus("sync_status").notNull().default("pending"),
    lastSyncedAt: utc("last_synced_at"),
    syncError: text("sync_error"),
    replanRunId: uuid("replan_run_id").references(() => replanRuns.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    index("scheduled_blocks_user_start_idx").on(t.userId, t.start),
    index("scheduled_blocks_task_idx").on(t.taskId),
    uniqueIndex("scheduled_blocks_google_event_idx")
      .on(t.userId, t.googleEventId)
      .where(sql`${t.googleEventId} is not null`),
    check("scheduled_blocks_end_after_start", sql`${t.end} > ${t.start}`),
    check(
      "scheduled_blocks_part_range",
      sql`${t.partIndex} between 1 and ${t.partCount}`,
    ),
  ],
);
