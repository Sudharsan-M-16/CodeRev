import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { reviewDrillSchema } from "@/lib/validations/schemas";
import { problemInclude } from "@/lib/queries/problems";
import { publishDrillCompleted } from "@/lib/events/publisher";

const QUEUE_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const dueOnly = request.nextUrl.searchParams.get("due") === "true";
    const drillType = request.nextUrl.searchParams.get("drillType") as "IMPLEMENT" | "MINDSOLVE" | null;
    const now = new Date();

    const where = dueOnly
      ? { userId, nextDueAt: { lte: now } }
      : { userId };

    const [totalDue, problems] = await Promise.all([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        include: problemInclude,
        orderBy: [{ nextDueAt: "asc" }, { createdAt: "asc" }],
        take: dueOnly ? QUEUE_LIMIT : 50,
      }),
    ]);

    return jsonOk({
      items: problems.map((problem) => ({
        id: problem.id,
        drillType: drillType ?? "IMPLEMENT",
        problem,
      })),
      totalDue,
      limit: dueOnly ? QUEUE_LIMIT : 50,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    const data = reviewDrillSchema.parse(body);
    
    // Fire and Forget Domain Event (Decouples API from DB processing)
    await publishDrillCompleted({
      userId,
      problemId: data.problemId ?? undefined,
      tagId: data.tagId ?? undefined,
      outcome: data.outcome,
      durationSeconds: data.durationSeconds ?? null,
      timestamp: new Date(),
      clientSessionId: data.clientSessionId,
    });

    return jsonOk({ status: "processing" }, 202);
  } catch (error) {
    return handleApiError(error);
  }
}
