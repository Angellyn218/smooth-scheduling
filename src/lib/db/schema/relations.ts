import { relations } from "drizzle-orm";
import { account, session, user } from "./auth";
import { calendarEvents, googleSyncState } from "./calendar";
import { replanRuns } from "./replan";
import { userSettings } from "./settings";
import { scheduledBlocks, tasks } from "./tasks";

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  settings: one(userSettings),
  tasks: many(tasks),
  scheduledBlocks: many(scheduledBlocks),
  calendarEvents: many(calendarEvents),
  googleSyncStates: many(googleSyncState),
  replanRuns: many(replanRuns),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, { fields: [userSettings.userId], references: [user.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(user, { fields: [tasks.userId], references: [user.id] }),
  blocks: many(scheduledBlocks),
}));

export const scheduledBlocksRelations = relations(scheduledBlocks, ({ one }) => ({
  task: one(tasks, { fields: [scheduledBlocks.taskId], references: [tasks.id] }),
  user: one(user, { fields: [scheduledBlocks.userId], references: [user.id] }),
  replanRun: one(replanRuns, {
    fields: [scheduledBlocks.replanRunId],
    references: [replanRuns.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(user, { fields: [calendarEvents.userId], references: [user.id] }),
}));

export const googleSyncStateRelations = relations(googleSyncState, ({ one }) => ({
  user: one(user, { fields: [googleSyncState.userId], references: [user.id] }),
}));

export const replanRunsRelations = relations(replanRuns, ({ one, many }) => ({
  user: one(user, { fields: [replanRuns.userId], references: [user.id] }),
  blocks: many(scheduledBlocks),
}));
