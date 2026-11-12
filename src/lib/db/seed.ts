// Sample data for local development. Everything belongs to one seed user, so
// removing it never touches real data. Times are relative to `now`.
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import type {
  NewCalendarEvent,
  NewScheduledBlock,
  NewTask,
  ScheduleSnapshot,
} from "./models";
import {
  calendarEvents,
  googleSyncState,
  replanRuns,
  scheduledBlocks,
  session,
  account,
  tasks,
  user,
  userSettings,
} from "./schema";

export const SEED_USER_ID = "seed-user";
export const SEED_TIME_ZONE = "America/Los_Angeles";

// Fixed IDs so blocks, runs, and snapshots can reference tasks.
const TASK = {
  proposal: "00000000-0000-4000-8000-000000000001",
  rent: "00000000-0000-4000-8000-000000000002",
  haircut: "00000000-0000-4000-8000-000000000003",
  reading: "00000000-0000-4000-8000-000000000004",
  garage: "00000000-0000-4000-8000-000000000005",
  taxes: "00000000-0000-4000-8000-000000000006",
  passport: "00000000-0000-4000-8000-000000000007",
  oldIdea: "00000000-0000-4000-8000-000000000008",
  plumber: "00000000-0000-4000-8000-000000000009",
} as const;
const REPLAN_RUN_ID = "00000000-0000-4000-8000-0000000000a1";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Local calendar date (YYYY-MM-DD) in `timeZone`. */
function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
}

export interface SeedOptions {
  now?: Date;
}

/** Replaces any existing seed data with a fresh set. */
export async function seed(db: Database, { now = new Date() }: SeedOptions = {}) {
  // Anchor on the top of the next hour so blocks line up nicely.
  const base = new Date(Math.ceil(now.getTime() / HOUR) * HOUR);
  const at = (hours: number, minutes = 0) =>
    new Date(base.getTime() + hours * HOUR + minutes * MINUTE);
  const dayOffset = (days: number) =>
    localDate(new Date(now.getTime() + days * DAY), SEED_TIME_ZONE);

  await db.transaction(async (tx) => {
    await removeSeedData(tx);

    await tx.insert(user).values({
      id: SEED_USER_ID,
      name: "Seed User",
      email: "seed-user@example.com",
      emailVerified: true,
    });

    await tx.insert(userSettings).values({
      userId: SEED_USER_ID,
      timeZone: SEED_TIME_ZONE,
      blockingCalendarIds: ["primary"],
    });

    const taskRows: Omit<NewTask, "userId">[] = [
      {
        id: TASK.proposal,
        title: "Write project proposal",
        notes: "Split across two gaps (US-08).",
        durationMinutes: 180,
        remainingMinutes: 180,
        priority: 1,
        deadline: at(72),
        sortOrder: 1,
      },
      {
        id: TASK.rent,
        title: "Pay rent",
        durationMinutes: 15,
        remainingMinutes: 15,
        priority: 2,
        deadline: at(20), // < 24 h away: urgent (US-13)
        sortOrder: 2,
      },
      {
        id: TASK.haircut,
        title: "Haircut",
        notes: "Dragged to a time, so it's locked (US-26).",
        durationMinutes: 45,
        remainingMinutes: 45,
        priority: 3,
        splittable: false,
        isLocked: true,
        lockedStart: at(26),
        lockedEnd: at(26, 45),
        sortOrder: 3,
      },
      {
        id: TASK.reading,
        title: "Read chapter 4",
        notes: "Half done already.",
        durationMinutes: 90,
        remainingMinutes: 45,
        priority: 3,
        sortOrder: 4,
      },
      {
        id: TASK.garage,
        title: "Clean garage",
        durationMinutes: 120,
        remainingMinutes: 120,
        priority: 5,
        sortOrder: 5,
      },
      {
        id: TASK.taxes,
        title: "File taxes",
        notes: "Too long to fit before its deadline: flagged (US-16).",
        durationMinutes: 600,
        remainingMinutes: 600,
        priority: 2,
        splittable: false,
        deadline: at(6),
        sortOrder: 6,
      },
      {
        id: TASK.passport,
        title: "Renew passport",
        durationMinutes: 30,
        remainingMinutes: 0,
        priority: 2,
        status: "done",
        completedAt: new Date(now.getTime() - DAY),
        sortOrder: 7,
      },
      {
        id: TASK.oldIdea,
        title: "Learn the banjo",
        durationMinutes: 60,
        remainingMinutes: 60,
        priority: 5,
        status: "archived",
        sortOrder: 8,
      },
      {
        id: TASK.plumber,
        title: "Call plumber",
        notes: "Soft-deleted; undo would restore it.",
        durationMinutes: 15,
        remainingMinutes: 15,
        priority: 3,
        deletedAt: new Date(now.getTime() - HOUR),
        sortOrder: 9,
      },
    ];
    await tx
      .insert(tasks)
      .values(taskRows.map((t) => ({ ...t, userId: SEED_USER_ID })));

    const snapshotBefore: ScheduleSnapshot = {
      blocks: [
        {
          taskId: TASK.proposal,
          start: at(1).toISOString(),
          end: at(4).toISOString(),
          partIndex: 1,
          partCount: 1,
          googleEventId: null,
        },
      ],
    };
    await tx.insert(replanRuns).values({
      id: REPLAN_RUN_ID,
      userId: SEED_USER_ID,
      trigger: "task_change",
      snapshotBefore,
      movedItems: [
        {
          taskId: TASK.proposal,
          title: "Write project proposal",
          partIndex: 1,
          partCount: 2,
          from: { start: at(1).toISOString(), end: at(4).toISOString() },
          to: { start: at(2).toISOString(), end: at(4).toISOString() },
        },
        {
          taskId: TASK.rent,
          title: "Pay rent",
          partIndex: 1,
          partCount: 1,
          from: null,
          to: { start: at(1).toISOString(), end: at(1, 15).toISOString() },
        },
      ],
      flaggedTasks: [
        {
          taskId: TASK.taxes,
          title: "File taxes",
          reason: "deadline_unreachable",
          detail: "Needs 600 min before its deadline; only ~5 h available.",
        },
      ],
    });

    const blockRows: Omit<NewScheduledBlock, "userId">[] = [
      {
        taskId: TASK.rent,
        start: at(1),
        end: at(1, 15),
        syncStatus: "synced",
        googleEventId: "seedappevt002",
        lastSyncedAt: now,
      },
      {
        taskId: TASK.proposal,
        start: at(2),
        end: at(4),
        partIndex: 1,
        partCount: 2,
        syncStatus: "synced",
        googleEventId: "seedappevt001",
        lastSyncedAt: now,
      },
      {
        taskId: TASK.proposal,
        start: at(19),
        end: at(20),
        partIndex: 2,
        partCount: 2,
        syncStatus: "pending",
      },
      {
        taskId: TASK.reading,
        start: at(5),
        end: at(5, 45),
        syncStatus: "error",
        syncError: "Google API 503: backend error (sample)",
      },
      {
        taskId: TASK.haircut,
        start: at(26),
        end: at(26, 45),
        syncStatus: "pending",
      },
    ];
    await tx.insert(scheduledBlocks).values(
      blockRows.map((b) => ({
        ...b,
        userId: SEED_USER_ID,
        replanRunId: REPLAN_RUN_ID,
      })),
    );

    const eventRows: Omit<NewCalendarEvent, "userId">[] = [
      {
        googleEventId: "seedevtstandup",
        calendarId: "primary",
        title: "Team standup",
        start: at(18),
        end: at(18, 30),
        responseStatus: "accepted",
      },
      {
        googleEventId: "seedevtdentist",
        calendarId: "primary",
        title: "Dentist",
        start: at(42),
        end: at(43),
      },
      {
        googleEventId: "seedevtconference",
        calendarId: "primary",
        title: "Conference (all day)",
        isAllDay: true,
        startDate: dayOffset(4),
        endDate: dayOffset(5), // exclusive
      },
      {
        googleEventId: "seedevtdeclined",
        calendarId: "primary",
        title: "Optional sync (declined)",
        start: at(20),
        end: at(21),
        responseStatus: "declined",
      },
      {
        googleEventId: "seedevtfree",
        calendarId: "primary",
        title: "Focus reminder (show as free)",
        start: at(24),
        end: at(25),
        transparency: "transparent",
      },
      {
        googleEventId: "seedevtcancelled",
        calendarId: "primary",
        title: "Cancelled lunch",
        start: at(30),
        end: at(31),
        status: "cancelled",
      },
      {
        googleEventId: "seedevtholiday",
        calendarId: "en.usa#holiday@group.v.calendar.google.com",
        title: "Holiday (non-blocking calendar)",
        isAllDay: true,
        startDate: dayOffset(2),
        endDate: dayOffset(3),
      },
      {
        googleEventId: "seedevtweekly",
        calendarId: "primary",
        title: "Weekly 1:1 (recurring instance)",
        start: at(48),
        end: at(48, 30),
        recurringEventId: "seedevtweeklyseries",
      },
      // Mirrors of the blocks the app wrote to Google (US-24).
      {
        googleEventId: "seedappevt001",
        calendarId: "primary",
        title: "Write project proposal (part 1 of 2)",
        start: at(2),
        end: at(4),
        isAppManaged: true,
      },
      {
        googleEventId: "seedappevt002",
        calendarId: "primary",
        title: "Pay rent",
        start: at(1),
        end: at(1, 15),
        isAppManaged: true,
      },
    ];
    await tx.insert(calendarEvents).values(
      eventRows.map((e) => ({
        ...e,
        userId: SEED_USER_ID,
        googleUpdatedAt: now,
      })),
    );

    await tx.insert(googleSyncState).values({
      userId: SEED_USER_ID,
      calendarId: "primary",
      syncToken: "seed-sync-token",
      channelId: "seed-channel-primary",
      resourceId: "seed-resource-primary",
      channelToken: "seed-channel-token",
      channelExpiresAt: new Date(now.getTime() + 6 * DAY),
      lastFullSyncAt: now,
    });
  });
}

/** Deletes all seed data. Safe to run when none exists. */
export async function unseed(db: Database) {
  await db.transaction(removeSeedData);
}

// Explicit per-table deletes (children first) rather than relying on cascades alone.
async function removeSeedData(tx: Database) {
  await tx.delete(scheduledBlocks).where(eq(scheduledBlocks.userId, SEED_USER_ID));
  await tx.delete(replanRuns).where(eq(replanRuns.userId, SEED_USER_ID));
  await tx.delete(tasks).where(eq(tasks.userId, SEED_USER_ID));
  await tx.delete(calendarEvents).where(eq(calendarEvents.userId, SEED_USER_ID));
  await tx.delete(googleSyncState).where(eq(googleSyncState.userId, SEED_USER_ID));
  await tx.delete(userSettings).where(eq(userSettings.userId, SEED_USER_ID));
  await tx.delete(session).where(eq(session.userId, SEED_USER_ID));
  await tx.delete(account).where(eq(account.userId, SEED_USER_ID));
  await tx.delete(user).where(eq(user.id, SEED_USER_ID));
}
