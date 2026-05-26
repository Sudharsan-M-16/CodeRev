import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

// Centralized Redis Connection for BullMQ
export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Strict Typings for Event-Driven Payloads
export type AIJobPayload = 
  | { type: "auto-tag"; problemId: string; description: string; userId: string }
  | { type: "generate-embeddings"; problemId: string; userId: string };

export type TelemetryPayload = 
  | { type: "sync-daily-heatmap"; userId: string }
  | { type: "sync-radar-chart"; userId: string };

export type IngestPayload = 
  | { 
      type: "batch-session-events"; 
      userId: string; 
      drillSessionId: string; 
      events: any[] 
    };

const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5, // 5 retries for AI/DB flakiness
    backoff: {
      type: "exponential",
      delay: 2000, // Starts at 2s, then 4s, 8s, 16s...
    },
    removeOnComplete: 100,
    removeOnFail: 500, // Keep more failures for debugging Dead Letters
  },
};

// Domain-Specific Queues
export const aiQueue = new Queue<AIJobPayload>("ai-pipeline", defaultQueueOptions);
export const telemetryQueue = new Queue<TelemetryPayload>("telemetry-pipeline", defaultQueueOptions);
export const fsrsQueue = new Queue("fsrs-pipeline", defaultQueueOptions);
export const ingestQueue = new Queue<IngestPayload>("ingest-pipeline", defaultQueueOptions);

// Graceful teardown
export async function closeQueues() {
  await Promise.all([
    aiQueue.close(),
    telemetryQueue.close(),
    fsrsQueue.close(),
    ingestQueue.close(),
  ]);
  redisConnection.quit();
}
