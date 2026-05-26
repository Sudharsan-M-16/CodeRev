import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

// Centralized Redis Connection for BullMQ
export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // BullMQ requires this to be null
});

const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs for observability
    removeOnFail: 500,     // Keep last 500 failed jobs for debugging
  },
};

// Create typed queues for different domains
export const aiAnalysisQueue = new Queue("ai-analysis", defaultQueueOptions);
export const problemIngestionQueue = new Queue("problem-ingestion", defaultQueueOptions);
export const telemetryAggregationQueue = new Queue("telemetry-aggregation", defaultQueueOptions);
export const fsrsSchedulingQueue = new Queue("fsrs-scheduling", defaultQueueOptions);

// Graceful shutdown helper for Next.js teardowns
export async function closeQueues() {
  await Promise.all([
    aiAnalysisQueue.close(),
    problemIngestionQueue.close(),
    telemetryAggregationQueue.close(),
    fsrsSchedulingQueue.close(),
  ]);
  redisConnection.quit();
}
