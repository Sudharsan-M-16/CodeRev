import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { reviewDrillSchema } from "@/lib/validations/schemas";
import { scheduleNextReview } from "@/lib/drills/spaced-repetition";
import { problemInclude } from "@/lib/queries/problems";

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
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (data.problemId) {
        const problem = await tx.problem.findUniqueOrThrow({
          where: { id: data.problemId },
          select: { currentInterval: true },
        });
        const completedCount = await tx.drillSession.count({ where: { problemId: data.problemId } });
        const scheduled = scheduleNextReview(
          { currentInterval: problem.currentInterval, completedCount },
          data.outcome,
          now
        );

        await tx.drillSession.create({
          data: {
            userId,
            problemId: data.problemId,
            drillType: data.drillType,
            outcome: data.outcome,
            durationSeconds: data.durationSeconds ?? null,
            previousInterval: problem.currentInterval,
          },
        });

        return tx.problem.update({
          where: { id: data.problemId },
          data: {
            lastDrilledAt: now,
            nextDueAt: scheduled.nextDueAt,
            currentInterval: scheduled.intervalDays,
          },
          include: problemInclude,
        });
      }

      const tag = await tx.tag.findUniqueOrThrow({
        where: { id: data.tagId },
        select: { currentInterval: true },
      });
      const completedCount = await tx.drillSession.count({ where: { tagId: data.tagId } });
      const scheduled = scheduleNextReview(
        { currentInterval: tag.currentInterval, completedCount },
        data.outcome,
        now
      );

      await tx.drillSession.create({
        data: {
          userId,
          tagId: data.tagId,
          drillType: data.drillType,
          outcome: data.outcome,
          durationSeconds: data.durationSeconds ?? null,
          previousInterval: tag.currentInterval,
        },
      });

      return tx.tag.update({
        where: { id: data.tagId },
        data: {
          drillCount: { increment: 1 },
          lastDrilledAt: now,
          nextDueAt: scheduled.nextDueAt,
          currentInterval: scheduled.intervalDays,
        },
      });
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
