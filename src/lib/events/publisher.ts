import { fsrsQueue, telemetryQueue, aiQueue } from "@/lib/queue/client";
import { DrillOutcome } from "@prisma/client";

/**
 * Event-Driven Architecture (Pub/Sub Router)
 * 
 * Instead of tightly coupling domains (e.g. Drills updating Telemetry and AI directly),
 * domains emit "Events". This publisher acts as a fan-out router, sending async jobs
 * to the appropriate specialized queues.
 */

export interface DrillCompletedEvent {
  userId: string;
  problemId?: string;
  tagId?: string;
  outcome: DrillOutcome;
  durationSeconds: number | null;
  timestamp: Date;
}

export async function publishDrillCompleted(event: DrillCompletedEvent) {
  const jobIdContext = `${event.userId}-${event.problemId || event.tagId}-${event.timestamp.getTime()}`;

  // 1. Fan-out to FSRS Scheduling (Core Requirement)
  await fsrsQueue.add("process-drill", event, {
    jobId: `fsrs-${jobIdContext}`,
    removeOnComplete: true,
  });

  // 2. Fan-out to Telemetry (Async aggregations)
  await telemetryQueue.add("sync-daily-heatmap", { userId: event.userId }, {
    jobId: `telemetry-heatmap-${event.userId}-${event.timestamp.toISOString().split('T')[0]}`,
  });

  await telemetryQueue.add("sync-radar-chart", { userId: event.userId }, {
    jobId: `telemetry-radar-${event.userId}`,
    delay: 5000, // Debounce massive recalculations if drilling multiple quickly
  });

  // 3. Fan-out to AI (If they struggled, generate a Bridging Mentor recommendation async)
  if (event.outcome === "STRUGGLED" || event.outcome === "BLOCKED") {
    if (event.problemId) {
      await aiQueue.add("recommend-bridge", { 
        type: "auto-tag", // reusing payload type structure for example
        problemId: event.problemId, 
        userId: event.userId,
        description: "User struggled, generating RAG bridge."
      }, {
        jobId: `ai-bridge-${jobIdContext}`,
      });
    }
  }
}
