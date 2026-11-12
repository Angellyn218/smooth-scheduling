// Shapes of the JSON columns. Times inside JSON are ISO-8601 UTC strings.

export type IsoDateTime = string;

export interface TimeRange {
  start: IsoDateTime;
  end: IsoDateTime;
}

/** One block as it existed before a re-plan; enough to restore it on undo (US-19). */
export interface SnapshotBlock extends TimeRange {
  taskId: string;
  partIndex: number;
  partCount: number;
  googleEventId: string | null;
}

export interface ScheduleSnapshot {
  blocks: SnapshotBlock[];
}

/** One line of the "what moved" summary (US-18). `null` = newly placed / removed. */
export interface MovedItem {
  taskId: string;
  title: string;
  partIndex: number;
  partCount: number;
  from: TimeRange | null;
  to: TimeRange | null;
}

export type FlagReason =
  | "deadline_unreachable"
  | "outside_planning_window"
  | "no_gap_for_unsplittable";

/** A task the scheduler couldn't place, and why (US-16). */
export interface FlaggedTask {
  taskId: string;
  title: string;
  reason: FlagReason;
  detail?: string;
}

/** Weekly available hours (FV-05). Keys are weekdays 0 (Sun)–6, times are local "HH:mm". */
export type AvailableHours = Partial<
  Record<0 | 1 | 2 | 3 | 4 | 5 | 6, { start: string; end: string }[]>
>;
