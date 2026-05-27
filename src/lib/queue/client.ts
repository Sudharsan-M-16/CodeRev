import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

// Centralized Redis Connection for BullMQ
export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// BullMQ expects { connection: IORedis } — using the instance directly satisfies ConnectionOptions
export const bullMQConnection = { connection: redisConnection };

// Strict Typings for Event-Driven Payloads
export type AIJobPayload = 
  | { type: "auto-tag"; problemId: string; description: string; userId: string }
  | { type: "recommend-bridge"; problemId: string; description: string; userId: string }
  | { type: "generate-embeddings"; problemId: string; userId: string }
  | { type: "generate-replay-insights"; drillSessionId: string; problemTitle: string; userId: string }
  | { type: "extract-mental-models"; drillSessionId: string; userId: string };

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
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
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
