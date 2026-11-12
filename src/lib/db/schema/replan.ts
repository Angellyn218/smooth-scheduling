import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps, utc } from "./columns";
import { replanTrigger } from "./enums";
import type { FlaggedTask, MovedItem, ScheduleSnapshot } from "./json-types";

/** History of each re-plan; powers "what moved" (US-18) and undo (US-19). */
export const replanRuns = pgTable(
  "replan_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trigger: replanTrigger("trigger").notNull(),
    snapshotBefore: jsonb("snapshot_before").$type<ScheduleSnapshot>().notNull(),
    movedItems: jsonb("moved_items")
      .$type<MovedItem[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    flaggedTasks: jsonb("flagged_tasks")
      .$type<FlaggedTask[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    undoneAt: utc("undone_at"),
    ...timestamps(),
  },
  (t) => [index("replan_runs_user_created_idx").on(t.userId, t.createdAt.desc())],
);
