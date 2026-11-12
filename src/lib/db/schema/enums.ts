import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", ["todo", "done", "archived"]);

export const syncStatus = pgEnum("sync_status", ["pending", "synced", "error"]);

export const replanTrigger = pgEnum("replan_trigger", [
  "task_change",
  "google_webhook",
  "cron",
  "manual",
]);

// Values below mirror the Google Calendar API so rows can be stored verbatim.
export const eventStatus = pgEnum("event_status", [
  "confirmed",
  "tentative",
  "cancelled",
]);

/** "transparent" = "show as free"; such events don't block time. */
export const eventTransparency = pgEnum("event_transparency", [
  "opaque",
  "transparent",
]);

/** The user's own RSVP. Declined invites don't block time. */
export const responseStatus = pgEnum("response_status", [
  "needsAction",
  "declined",
  "tentative",
  "accepted",
]);
