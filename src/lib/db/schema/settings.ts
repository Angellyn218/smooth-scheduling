import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps } from "./columns";
import type { AvailableHours } from "./json-types";

/** One row per user. */
export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** IANA zone, e.g. America/Los_Angeles. Drives day boundaries and all-day events. */
    timeZone: text("time_zone").notNull().default("UTC"),
    bufferMinutes: integer("buffer_minutes").notNull().default(10),
    planningWindowDays: integer("planning_window_days").notNull().default(7),
    minChunkMinutes: integer("min_chunk_minutes").notNull().default(15),
    /** Calendars that count as busy; others (Holidays, Birthdays…) are ignored. */
    blockingCalendarIds: text("blocking_calendar_ids")
      .array()
      .notNull()
      .default(sql`'{primary}'::text[]`),
    /** Unused until FV-05; null = available any time. */
    availableHours: jsonb("available_hours").$type<AvailableHours>(),
    ...timestamps(),
  },
  (t) => [
    check("user_settings_buffer_nonnegative", sql`${t.bufferMinutes} >= 0`),
    check("user_settings_window_positive", sql`${t.planningWindowDays} > 0`),
    check("user_settings_min_chunk_positive", sql`${t.minChunkMinutes} > 0`),
  ],
);
