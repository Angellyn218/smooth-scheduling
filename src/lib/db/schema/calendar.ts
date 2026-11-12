import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps, utc } from "./columns";
import { eventStatus, eventTransparency, responseStatus } from "./enums";

/** Local copy of Google Calendar events. */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    calendarId: text("calendar_id").notNull(),
    title: text("title"),
    /** Timed events only. */
    start: utc("start"),
    end: utc("end"),
    /**
     * All-day events only, as plain dates (no time zone). `endDate` is exclusive,
     * as in Google. Blocks the whole day in the user's time zone (US-22).
     */
    isAllDay: boolean("is_all_day").notNull().default(false),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    transparency: eventTransparency("transparency").notNull().default("opaque"),
    responseStatus: responseStatus("response_status"),
    status: eventStatus("status").notNull().default("confirmed"),
    /** True for events this app wrote; the only ones it may edit (US-24). */
    isAppManaged: boolean("is_app_managed").notNull().default(false),
    recurringEventId: text("recurring_event_id"),
    /** Google's `updated` (last-modified) time. */
    googleUpdatedAt: utc("google_updated_at"),
    ...timestamps(),
  },
  (t) => [
    // Upsert target for idempotent sync.
    uniqueIndex("calendar_events_google_idx").on(
      t.userId,
      t.calendarId,
      t.googleEventId,
    ),
    index("calendar_events_user_start_idx").on(t.userId, t.start),
    index("calendar_events_user_start_date_idx").on(t.userId, t.startDate),
    check(
      "calendar_events_time_shape",
      sql`(${t.isAllDay} and ${t.startDate} is not null and ${t.endDate} > ${t.startDate} and ${t.start} is null and ${t.end} is null)
        or (not ${t.isAllDay} and ${t.start} is not null and ${t.end} >= ${t.start} and ${t.startDate} is null and ${t.endDate} is null)`,
    ),
  ],
);

/** Incremental sync + push-channel state, one row per calendar. */
export const googleSyncState = pgTable(
  "google_sync_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(),
    syncToken: text("sync_token"),
    /** Push channels expire; renew before channelExpiresAt. */
    channelId: text("channel_id").unique(),
    resourceId: text("resource_id"),
    /** Secret echoed back in X-Goog-Channel-Token; verify it on every webhook. */
    channelToken: text("channel_token"),
    channelExpiresAt: utc("channel_expires_at"),
    lastFullSyncAt: utc("last_full_sync_at"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("google_sync_state_user_calendar_idx").on(
      t.userId,
      t.calendarId,
    ),
    index("google_sync_state_channel_expires_idx").on(t.channelExpiresAt),
  ],
);
