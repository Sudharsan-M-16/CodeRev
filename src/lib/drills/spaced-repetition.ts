import type { DrillOutcome } from "@prisma/client";

export interface DrillScheduleState {
  currentInterval: number | null;
  completedCount: number;
}

export interface DrillScheduleResult {
  intervalDays: number;
  nextDueAt: Date;
}

const SECOND_DRILL_INTERVALS: Record<DrillOutcome, number> = {
  NAILED: 4,
  MOSTLY: 2,
  STRUGGLED: 1,
  BLOCKED: 1,
};

const MULTIPLIERS: Record<DrillOutcome, number | "reset"> = {
  NAILED: 2.5,
  MOSTLY: 1.8,
  STRUGGLED: 1,
  BLOCKED: "reset",
};

export function scheduleNextReview(
  state: DrillScheduleState,
  outcome: DrillOutcome,
  now: Date = new Date()
): DrillScheduleResult {
  let intervalDays: number;

  if (state.completedCount === 0) {
    intervalDays = 1;
  } else if (state.completedCount === 1) {
    intervalDays = SECOND_DRILL_INTERVALS[outcome];
  } else {
    const current = state.currentInterval ?? 1;
    const multiplier = MULTIPLIERS[outcome];
    intervalDays = multiplier === "reset" ? 1 : Math.max(1, Math.round(current * multiplier));
  }

  const nextDueAt = new Date(now);
  nextDueAt.setUTCDate(nextDueAt.getUTCDate() + intervalDays);

  return { intervalDays, nextDueAt };
}

export function isDue(nextDueAt: Date | null, now: Date = new Date()): boolean {
  return nextDueAt !== null && nextDueAt <= now;
}
