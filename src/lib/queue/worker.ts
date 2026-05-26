import { Worker, Job } from "bullmq";
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { redisConnection, aiQueue, telemetryQueue, fsrsQueue, ingestQueue, AIJobPayload } from "./client";

/**
 * BullMQ Worker & Observability Dashboard
 * Run via: `npm run worker`
 */

// 1. Initialize Workers
const aiWorker = new Worker<AIJobPayload>(
  "ai-pipeline",
  async (job) => {
    console.log(`[AI Worker] Processing ${job.data.type} for problem ${job.data.problemId}`);

    if (job.data.type === "auto-tag") {
      // Simulate API call to Anthropic
      await new Promise((res) => setTimeout(res, 2500));
      return { success: true, tags: ["dp", "memoization"] };
    }

    if (job.data.type === "generate-embeddings") {
      const { prisma } = await import("@/lib/db/prisma");
      const { generateProblemEmbedding } = await import("@/lib/ai/embeddings");

      // 1. Fetch the problem to chunk and embed
      const problem = await prisma.problem.findUnique({
        where: { id: job.data.problemId },
        select: { title: true, summary: true, notes: true }
      });

      if (!problem) throw new Error("Problem not found");

      // 2. Chunk text securely (Combine title and notes for semantic density)
      const textToEmbed = `${problem.title}\n\n${problem.summary ?? ""}\n\n${problem.notes ?? ""}`.substring(0, 8000); // OpenAI limit fallback

      // 3. Generate vectors (BullMQ limits handle 429s + Retries)
      const vector = await generateProblemEmbedding(textToEmbed);

      // 4. Upsert vector into pgvector (requires raw SQL)
      // Prisma's array formatting must be exact: '[0.1, 0.2, ...]'
      const vectorString = `[${vector.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "Problem" SET embedding = $1::vector WHERE id = $2`,
        vectorString, 
        job.data.problemId
      );

      return { success: true, vectors: vector.length };
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Strict Rate Limiting: Max 2 concurrent AI API calls to prevent 429s
    limiter: {
      max: 10,
      duration: 1000, // Max 10 requests per second
    },
  }
);

aiWorker.on("completed", (job) => console.log(`[AI Worker] ✅ Job ${job.id} completed.`));
aiWorker.on("failed", (job, err) => console.log(`[AI Worker] ❌ Job ${job?.id} failed:`, err));

const fsrsWorker = new Worker(
  "fsrs-pipeline",
  async (job) => {
    console.log(`[FSRS Worker] Processing drill for user ${job.data.userId}`);
    const { prisma } = await import("@/lib/db/prisma");
    const { getNextFSRSState } = await import("@/lib/drills/fsrs");

    // Decoupled DB write: We handle the actual drill session creation and FSRS state update asynchronously.
    const { problemId, tagId, outcome, durationSeconds, userId, timestamp } = job.data;
    
    // Simplification for the blueprint: Fetch problem, run FSRS, update problem.
    if (problemId) {
      const problem = await prisma.problem.findUnique({ where: { id: problemId } });
      if (problem) {
        const nextState = getNextFSRSState(
          {
            due: problem.nextDueAt ?? undefined,
            stability: problem.fsrsStability ?? undefined,
            difficulty: problem.fsrsDifficulty ?? undefined,
            reps: problem.fsrsReps,
            lapses: problem.fsrsLapses,
            state: problem.fsrsState,
          },
          outcome,
          new Date(timestamp)
        );

        await prisma.$transaction([
          prisma.drillSession.create({
            data: { userId, problemId, outcome, durationSeconds, drillType: "IMPLEMENT" }
          }),
          prisma.problem.update({
            where: { id: problemId },
            data: nextState
          })
        ]);
      }
    }
  },
  { connection: redisConnection }
);

const telemetryWorker = new Worker(
  "telemetry-pipeline",
  async (job) => {
    console.log(`[Telemetry Worker] Aggregating data: ${job.name}`);
    await new Promise((res) => setTimeout(res, 500));
  },
  { connection: redisConnection }
);

const ingestWorker = new Worker(
  "ingest-pipeline",
  async (job) => {
    if (job.name === "batch-session-events" || (job.data as any).type === "batch-session-events") {
      console.log(`[Ingest Worker] Processing batch of ${(job.data as any).events.length} events for session ${(job.data as any).drillSessionId}`);
      const { prisma } = await import("@/lib/db/prisma");
      
      const payload = job.data as any;
      
      // Perform a bulk insert of all chronological events
      await prisma.sessionEvent.createMany({
        data: payload.events.map((e: any) => ({
          drillSessionId: payload.drillSessionId,
          eventType: e.eventType,
          timestamp: new Date(e.timestamp),
          payload: e.payload
        })),
        skipDuplicates: true
      });
    }
  },
  { connection: redisConnection }
);

// 2. Setup Bull Board (Observability Dashboard)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(aiQueue),
    new BullMQAdapter(telemetryQueue),
    new BullMQAdapter(fsrsQueue),
    new BullMQAdapter(ingestQueue),
  ],
  serverAdapter: serverAdapter,
});

const app = express();
app.use("/admin/queues", serverAdapter.getRouter());

const PORT = process.env.WORKER_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Background Workers Running!`);
  console.log(`📊 Bull Board Dashboard available at: http://localhost:${PORT}/admin/queues`);
});

// 3. Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await aiWorker.close();
  redisConnection.quit();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("Shutting down workers...");
  await aiWorker.close();
  redisConnection.quit();
  process.exit(0);
});
