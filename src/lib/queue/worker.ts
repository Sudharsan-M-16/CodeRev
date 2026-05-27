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
    console.log(`[AI Worker] Processing ${job.data.type}`);

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

    if (job.data.type === "generate-replay-insights") {
      const d = job.data as Extract<AIJobPayload, { type: "generate-replay-insights" }>;
      const { prisma } = await import("@/lib/db/prisma");
      const { extractBehavioralHeuristics } = await import("@/lib/analytics/heuristics");
      const { generateReplayInsights } = await import("@/lib/ai/insights");

      // 1. Fetch raw timeline events
      const events = await prisma.sessionEvent.findMany({
        where: { drillSessionId: d.drillSessionId },
        orderBy: { timestamp: "asc" }
      });

      if (events.length === 0) return { success: false, reason: "No events to analyze" };

      // 2. Deterministic Heuristic Extraction
      const heuristics = extractBehavioralHeuristics(events as any);

      // 3. AI Pipeline (LLM analysis of heuristics)
      const insights = await generateReplayInsights(d.problemTitle, heuristics, events as any);

      // 4. Save Insights to DB linked to the DrillSession
      if (insights.length > 0) {
        await prisma.replayInsight.createMany({
          data: insights.map(insight => ({
            drillSessionId: d.drillSessionId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            timestampStart: insight.timestampStart,
            timestampEnd: insight.timestampEnd,
            confidence: insight.confidence,
            recommendation: insight.recommendation
          }))
        });
      }

      return { success: true, insightsGenerated: insights.length };
    }

    if (job.data.type === "extract-mental-models") {
      const { prisma } = await import("@/lib/db/prisma");
      const { extractMentalModels } = await import("@/lib/ai/extractMentalModels");
      const { generateProblemEmbedding } = await import("@/lib/ai/embeddings");

      // 1. Fetch deep context
      const session = await prisma.drillSession.findUnique({
        where: { id: job.data.drillSessionId },
        include: {
          problem: true,
          insights: true
        }
      });

      if (!session || !session.problem) return { success: false, reason: "No session or problem found" };

      // 2. Extract Models via LLM
      const extractedModels = await extractMentalModels(
        {
          title: session.problem.title,
          summary: session.problem.summary || "",
          notes: session.problem.notes || ""
        },
        session.insights.map((i: any) => ({ title: i.title, description: i.description, type: i.type }))
      );

      let newModelsCount = 0;
      let linkedModelsCount = 0;

      // 3. Deduplicate & Store using pgvector Semantic Search
      for (const model of extractedModels) {
        // Generate embedding for the mental model description
        const vector = await generateProblemEmbedding(`${model.name}: ${model.description}`);
        const vectorString = `[${vector.join(',')}]`;

        // Check if an existing semantically identical model exists for this user
        const existing = await prisma.$queryRaw<any[]>`
          SELECT id, 1 - (embedding <=> ${vectorString}::vector) as similarity
          FROM "MentalModel"
          WHERE "userId" = ${job.data.userId}
            AND embedding <=> ${vectorString}::vector < 0.15 -- Very high similarity threshold
          ORDER BY embedding <=> ${vectorString}::vector ASC
          LIMIT 1;
        `;

        let modelId = "";

        if (existing.length > 0) {
          // Found existing model, link it!
          modelId = existing[0].id;
          linkedModelsCount++;
        } else {
          // Create new model
          const created = await prisma.mentalModel.create({
            data: {
              userId: job.data.userId,
              name: model.name,
              type: model.type,
              description: model.description,
              confidence: model.confidence
            }
          });
          modelId = created.id;
          
          // Attach vector
          await prisma.$executeRawUnsafe(
            `UPDATE "MentalModel" SET embedding = $1::vector WHERE id = $2`,
            vectorString, 
            modelId
          );
          newModelsCount++;
        }

        // Link the problem to this mental model
        await prisma.problemMentalModel.upsert({
          where: {
            problemId_mentalModelId: {
              problemId: session.problem.id,
              mentalModelId: modelId
            }
          },
          create: { problemId: session.problem.id, mentalModelId: modelId },
          update: {}
        });
      }

      return { success: true, newModelsCount, linkedModelsCount };
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 1000,
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
    const { problemId, tagId, outcome, durationSeconds, userId, timestamp, clientSessionId } = job.data;
    
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
            data: { 
              id: clientSessionId, // Override CUID with the deterministic ID from the frontend to link telemetry!
              userId, 
              problemId, 
              outcome, 
              durationSeconds, 
              drillType: "IMPLEMENT" 
            }
          }),
          prisma.problem.update({
            where: { id: problemId },
            data: nextState
          })
        ]);
      }
    }
  },
  { connection: redisConnection as any }
);

const telemetryWorker = new Worker(
  "telemetry-pipeline",
  async (job) => {
    console.log(`[Telemetry Worker] Aggregating data: ${job.name}`);
    await new Promise((res) => setTimeout(res, 500));
  },
  { connection: redisConnection as any }
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
  { connection: redisConnection as any }
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
