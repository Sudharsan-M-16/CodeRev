import { Worker, Job } from "bullmq";
import { redisConnection } from "./client";

/**
 * In Next.js, workers typically run in a separate process to avoid 
 * blocking the main API thread or Vercel serverless function limits.
 * 
 * To run this locally: `npx tsx src/lib/queue/worker.ts`
 * In production: Deploy this as a long-running Node.js worker on Render/Railway/Fly.
 */

console.log("Starting BullMQ Workers...");

const aiAnalysisWorker = new Worker("ai-analysis", async (job: Job) => {
  console.log(`[AI Analysis] Processing job ${job.id} of type ${job.name}`);
  
  if (job.name === "auto-tag") {
    const { problemId, description } = job.data;
    // Here we would call the Anthropic API and update Prisma
    console.log(`Generating tags for problem: ${problemId}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { status: "completed", problemId };
  }

}, { connection: redisConnection });

aiAnalysisWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

aiAnalysisWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});

// Setup graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing queues');
  await aiAnalysisWorker.close();
  redisConnection.quit();
});
