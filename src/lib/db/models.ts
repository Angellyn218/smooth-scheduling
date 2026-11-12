// Row types inferred from the schema. `X` = a row read from the DB, `NewX` = insert payload.
import type {
  account,
  calendarEvents,
  eventStatus,
  eventTransparency,
  googleSyncState,
  replanRuns,
  replanTrigger,
  responseStatus,
  scheduledBlocks,
  session,
  syncStatus,
  tasks,
  taskStatus,
  user,
  userSettings,
} from "./schema";

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type ScheduledBlock = typeof scheduledBlocks.$inferSelect;
export type NewScheduledBlock = typeof scheduledBlocks.$inferInsert;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type GoogleSyncState = typeof googleSyncState.$inferSelect;
export type NewGoogleSyncState = typeof googleSyncState.$inferInsert;

export type ReplanRun = typeof replanRuns.$inferSelect;
export type NewReplanRun = typeof replanRuns.$inferInsert;

export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type SyncStatus = (typeof syncStatus.enumValues)[number];
export type ReplanTrigger = (typeof replanTrigger.enumValues)[number];
export type EventStatus = (typeof eventStatus.enumValues)[number];
export type EventTransparency = (typeof eventTransparency.enumValues)[number];
export type ResponseStatus = (typeof responseStatus.enumValues)[number];

export type {
  AvailableHours,
  FlaggedTask,
  FlagReason,
  MovedItem,
  ScheduleSnapshot,
  SnapshotBlock,
  TimeRange,
} from "./schema/json-types";
