import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ingestQueue } from "@/lib/queue/client";
import { jsonOk, handleApiError, jsonError } from "@/lib/api/response";
import { z } from "zod";

const sessionEventSchema = z.object({
  drillSessionId: z.string(),
  events: z.array(z.object({
    eventType: z.enum(["NOTE_TYPED", "CODE_PASTED", "TAB_SWITCHED", "HINT_REVEALED"]),
    timestamp: z.string(), // ISO string
    payload: z.any()
  }))
});

/**
 * High-frequency ingestion endpoint for Contest Replay tracking.
 * We immediately offload to Redis/BullMQ to prevent DB connection exhaustion.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    const data = sessionEventSchema.parse(body);

    // Fire and forget batch to the ingest pipeline
    await ingestQueue.add("batch-session-events", {
      type: "batch-session-events",
      userId,
      drillSessionId: data.drillSessionId,
      events: data.events
    }, {
      removeOnComplete: true
    });

    return jsonOk({ status: "queued", count: data.events.length }, 202);
  } catch (error) {
    return handleApiError(error);
  }
}
