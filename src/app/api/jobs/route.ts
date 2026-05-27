import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiQueue } from "@/lib/queue/client";
import { jsonOk, handleApiError, jsonError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    const { problemId, description } = body;

    if (!problemId) {
      return jsonError("problemId is required", 400);
    }

    // Enqueue a background job for AI Auto-Tagging
    // The worker will pick this up from Redis asynchronously
    const job = await aiQueue.add(
      "auto-tag", 
      { type: "auto-tag", problemId, description, userId },
      { 
        jobId: `auto-tag-${problemId}`,
        removeOnComplete: true,
      }
    );

    return jsonOk({ 
      message: "Job successfully enqueued", 
      jobId: job.id 
    }, 202);

  } catch (error) {
    return handleApiError(error);
  }
}
