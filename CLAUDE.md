# Auto Scheduler

A personal to-do list and planner that schedules flexible **tasks** around locked **events** from Google Calendar, splits tasks to fit free gaps, and re-plans automatically whenever the to-do list changes.

User stories live in the "Auto Scheduler — User Stories" doc. Story IDs (US-xx, FV-xx) are referenced below and should be referenced in commit messages and tests.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript in strict mode
- **UI:** React, Tailwind CSS, FullCalendar (React) for the calendar view
- **Client data:** TanStack Query, with optimistic updates
- **Database:** Postgres (local via Docker; hosted on Neon or Supabase), Drizzle ORM
- **Auth:** Better Auth with the Google provider (calendar scopes + offline access for refresh tokens)
- **Google:** Google Calendar API via the official `googleapis` client
- **Tests:** Vitest
- **Hosting:** Vercel (cron jobs for daily re-plan and webhook-channel renewal)

## Commands

- `npm run dev` — start the dev server
- `npm test` — run Vitest
- `npm run lint` — lint
- `npm run db:generate` / `npm run db:migrate` — Drizzle migrations

## Architecture

```
src/
  app/
    page.tsx                  # split view: to-do list (left), calendar (right)
    api/auth/[...all]/        # Better Auth handler
    api/google/webhook/       # Google Calendar push notifications
    api/cron/replan/          # daily re-plan + channel renewal
  components/
    task-list/                # left panel
    calendar-view/            # right panel (FullCalendar)
    moved-summary/            # "what moved" toast + undo
  lib/
    scheduler/                # PURE scheduling engine (see rules below)
      types.ts
      availability.ts         # free slots from events + buffers
      priority.ts             # priority ranking
      split.ts                # chunking tasks into gaps
      schedule.ts             # main entry: schedule(input) -> result
      __tests__/
    google/                   # API client, sync, freebusy, event writes
    db/                       # Drizzle schema + client
    auth.ts
  server/
    actions/                  # server actions: task CRUD, lock/unlock, undo
    replan.ts                 # loads data -> runs scheduler -> saves -> syncs to Google
```

### Key architectural rules

1. **The scheduler is pure.** `src/lib/scheduler` must not import the database, Google, Next.js, or anything with side effects. Input: events, tasks, settings, `now`. Output: placements, moved items, and flagged (unschedulable) tasks. This keeps it fast, testable, and swappable for a Python/OR-Tools service later.
2. **One source of truth.** The to-do list and calendar panels both render from the same schedule data. Panels never update each other directly.
3. **Re-plan flow:** change → `server/replan.ts` → scheduler → save to DB → update UI → sync to Google in the background. Never make the UI wait on the Google API.
4. **Debounce re-plans** while the user is typing (~500 ms, or on field blur).
5. **The app only edits Google events it created** (US-24). Mark them with an extended property (e.g. `autoScheduler: "true"`) and store the Google event ID.
6. **Webhook handlers must be idempotent.** The same notification arriving twice must not double-move anything. Use Google sync tokens for incremental sync.

## Scheduling rules (MVP)

### Items
- **Event** = has a set start and end time. Locked. Never moved, shortened, or split (US-01).
- **Task** = no set time; has title, duration (minutes), priority 1–5, optional deadline. The scheduler places it (US-02, US-03).
- Giving a task a start time makes it a locked event; removing it makes it a task again (US-04).
- **Dragging a task to a time locks it** there until the user unlocks it (US-26).

### Availability
- Planning window: **7 days ahead** from `now` (US-28).
- Any time not covered by an event is available; there are no working hours in the MVP (US-27).
- **All-day Google events block the entire day** (US-22).
- **Buffer: 10 minutes** before and after every event and scheduled task (US-06, US-07). Subtract buffers before computing free slots.

### Priority
- Score **1 = highest, 5 = lowest** (US-12).
- A task with a deadline **less than 24 hours away** outranks every task scored 2–5 (US-13).
- A score-1 task keeps its place, but if it is longer than the urgent task's duration + 1 hour, it is split so the urgent task fits before its deadline (US-13). *(The "+1 hour" interpretation is pending confirmation.)*
- Tasks without a deadline rank on score alone. Ties go to the earlier deadline (US-14).
- Higher-priority tasks may bump lower-priority tasks later; events and locked tasks are never bumped (US-15).

### Splitting
- If no single gap fits a task, split it across gaps (US-08).
- **Minimum chunk: 15 minutes** (US-10).
- Chunks show "part N of M" and link to the parent task (US-09).
- All chunks must finish before the deadline; otherwise **flag the task** rather than partially scheduling it (US-11, US-16).

### Re-planning
- Any task add/edit/complete/delete triggers a re-plan automatically, with no approval step (US-17).
- New or changed Google events also trigger a re-plan (US-25).
- Every re-plan produces a "what moved" summary (old → new time) (US-18) and supports one-step undo (US-19).
- Completing a task frees its time (US-20).
- Never silently drop a task. Anything that can't fit in the window or before its deadline is returned as flagged.

## Conventions

- **Time:** store all times in UTC (`timestamptz`). Convert to the user's IANA time zone only for display and for day-boundary logic (all-day events, "next 7 days"). Pass `now` into the scheduler; never call `Date.now()` inside it.
- **Durations** are integers in minutes.
- **Tests first for the scheduler.** Every rule above should have a test named with its story ID, e.g. `US-10: never creates chunks under 15 minutes`. Cover time zones, DST changes, overlapping events, and events that cross midnight.
- **Naming:** kebab-case files, PascalCase components, camelCase functions. Named exports, no default exports except Next.js pages/routes.
- **Server actions** validate input with Zod.
- **Secrets** live in `.env.local` only. Never commit them or paste them into prompts. Keep `.env.example` updated with variable names.
- Keep changes small and focused; one story or sub-task per change.

## Out of scope for the MVP (don't build yet)

- Adjustable or per-event buffer time (FV-01, FV-02)
- Repeating events or tasks (FV-03, FV-04)
- Set available hours (FV-05)
- Calendars other than Google
- Constraint-solver optimization (OR-Tools)

Design the data model so these can be added later without a rewrite (e.g. a `bufferMinutes` setting, a nullable recurrence rule).
