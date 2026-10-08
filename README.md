# Smooth Scheduling

## Description
An app that automatically schedules your day, gliding you into a smooth week. Using a priority todo list and your set events calendar, any busy week becomes easay and manageable.

Along with its primary purpose, this project is used to test how AI tools, particularly Claude Code and Codex, can be effectively used in software development.

## User stories
The MVP schedules flexible tasks around locked Google Calendar events, splits them to fit gaps, and re-plans automatically whenever the to-do list changes.

### Events and tasks

Anything with a set time is an event and never moves; anything without one is a task the scheduler places.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-01 | As a user, I want items with a set time to be treated as events, so my fixed commitments are protected. | Any item with a start and end time is an event; events are never moved, shortened or split by the scheduler. |
| US-02 | As a user, I want items without a set time to be treated as tasks, so the app can fit them in for me. | A task has a title, duration and priority but no start time; the scheduler assigns its time. |
| US-03 | As a user, I want to add a task with a duration and priority, so the app knows how much time it needs and how important it is. | Duration is required (in minutes); priority score 1–5 is required; deadline is optional. |
| US-04 | As a user, I want to turn a task into an event by giving it a set time, so I can pin something in place. | Adding a start time converts the task to a locked event; removing it converts it back to an adjustable task. |
| US-05 | As a user, I want to see at a glance which items are locked and which are adjustable. | Events and tasks are visually distinct on the calendar and in the list. |
| US-26 | As a user, I want a task I drag to a specific time to stay there. | Dragging a task locks it at the new time; the scheduler won't move it until the user unlocks it. |

### Buffer time

Every scheduled item gets a 10-minute buffer in the MVP; changing it is a future feature.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-06 | As a user, I want 10 minutes of buffer between scheduled items, so I'm not rushing from one thing to the next. | The scheduler leaves at least 10 minutes between any task and the event or task next to it. |
| US-07 | As a user, I want buffers counted when finding free time, so tasks never overlap the gap I need. | Free slots are calculated after subtracting buffers on both sides of each event. |

### Task splitting

A task that doesn't fit one gap is split across several, so long work still gets done in a busy week.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-08 | As a user, I want a long task split across free gaps between events, so it still gets scheduled when no single gap is big enough. | If no gap fits the full duration, the task is split into chunks that fill available gaps; chunk durations add up to the task's total. |
| US-09 | As a user, I want split chunks linked to the original task, so I can see my progress. | Each chunk shows the task name and its part (e.g. "2 of 3"); completing all chunks completes the task. |
| US-10 | As a user, I don't want tiny useless chunks. | Chunks are never shorter than 15 minutes. |
| US-11 | As a user, I want all chunks to finish before the task's deadline. | If chunks can't all fit before the deadline, the task is flagged instead of partly scheduled. |

### Priority

Priority combines the 1–5 score with how close the deadline is, so urgent low-score tasks don't get buried.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-12 | As a user, I want to rate each task 1–5, so the app knows what matters most to me. | Score is required; 1 is highest, 5 is lowest. |
| US-13 | As a user, I want deadlines to raise a task's urgency as they approach, so nothing important slips. | A task due in under 24 hours outranks every task scored 2–5. A score-1 task keeps its place, but if it is longer than the urgent task's duration + 1 hour, it is split so the urgent task fits before its deadline. Tasks with no deadline rank on score alone. |
| US-14 | As a user, I want higher-priority tasks placed earlier, so my best time goes to the most important work. | Tasks are scheduled in order of combined priority; ties go to the earlier deadline. |
| US-15 | As a user, I want lower-priority tasks bumped when a higher-priority one needs the space. | A higher-priority task can push lower-priority tasks later; events are never bumped. |
| US-16 | As a user, I want to be told when a task can't be scheduled before its deadline. | The task is flagged with a visible warning instead of being dropped silently. |

### Auto-rescheduling

Any change to the to-do list re-plans the schedule automatically, with no approval step.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-17 | As a user, I want my schedule to re-plan automatically when I add, edit, complete or delete a task. | Any to-do list change triggers the scheduler; updated times appear without pressing a button. |
| US-18 | As a user, I want to see what moved after an automatic change, so I'm never surprised. | A short summary lists each task that moved, with its old and new time. |
| US-19 | As a user, I want to undo the last automatic change, in case I don't like the result. | One-step undo restores the previous schedule. |
| US-20 | As a user, I want completed tasks to free up their time. | Marking a task done removes its remaining time and re-plans the rest. |
| US-27 | As a user, I want any time without an event to count as available. | The scheduler can use any free time, minus buffers; no fixed working hours in the MVP. |
| US-28 | As a user, I want my week planned in advance. | The scheduler plans 7 days ahead from now; tasks that don't fit in that window are flagged. |

### Google Calendar connection

Google Calendar is the only calendar in the MVP: events come in from it, scheduled tasks go back to it.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-21 | As a user, I want to sign in with Google and connect my calendar. | OAuth sign-in grants calendar access; the user can disconnect at any time. |
| US-22 | As a user, I want my Google events imported as locked events. | All events in the next 7 days are read in as locked events (US-01); all-day events block the whole day. |
| US-23 | As a user, I want scheduled tasks to appear in Google Calendar, so I see everything in one place. | Each task or chunk is written as a Google event, marked as app-managed. |
| US-24 | As a user, I want the app to only change events it created. | The app never edits or deletes events it didn't create. |
| US-25 | As a user, I want new Google events to trigger a re-plan. | A new or changed Google event re-runs the scheduler so tasks move out of the way. |

### Future versions

These are out of scope for the MVP, but the data model should leave room for them.

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| FV-01 | As a user, I want to change the default buffer time. | Buffer is set in settings (e.g. 0–60 minutes); new value applies on the next re-plan. |
| FV-02 | As a user, I want different buffers for specific events, e.g. longer after meetings that need travel. | A per-event buffer overrides the default. |
| FV-03 | As a user, I want repeating events (e.g. weekly class). | Repeat rules (daily, weekly, custom) generate locked events; editing one or all instances is supported. |
| FV-04 | As a user, I want repeating tasks (e.g. "gym 45 min, 3x a week"). | Each instance is scheduled as an adjustable task within its period. |
| FV-05 | As a user, I want to set available hours (e.g. waking hours or work hours). | Tasks are only scheduled inside the hours set in settings. |

## AI Usage
### Claude & Claude Code
* Claude was used to create User stories md from listed mvp requirements

### Codex
### VS Code Chatbot

