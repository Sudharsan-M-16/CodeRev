import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // 1. Data for GitHub Heatmap: Total drills completed per day
    // We group by raw Date. In Prisma, raw SQL is often best for date truncating, 
    // but we can query recent sessions and reduce in JS for simplicity/cross-db compatibility.
    const sessions = await prisma.drillSession.findMany({
      where: { 
        userId,
        createdAt: { gte: oneYearAgo }
      },
      select: {
        createdAt: true,
        outcome: true,
        problemId: true,
        tagId: true,
      }
    });

    const heatmapMap = new Map<string, number>();
    for (const session of sessions) {
      const dateStr = session.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      heatmapMap.set(dateStr, (heatmapMap.get(dateStr) || 0) + 1);
    }
    const heatmapData = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));

    // 2. Data for Tag Mastery Radar Chart (Win-rate grouped by Top-Level Domains)
    // Domains: Graphs, DP, Strings, Math, Geometry, Data Structures
    // In a real scenario, you map tagIds to these parent domains. We will calculate generic tag win-rates.
    const tagMasteryMap = new Map<string, { wins: number; total: number }>();

    for (const session of sessions) {
      if (!session.tagId) continue;
      const t = tagMasteryMap.get(session.tagId) || { wins: 0, total: 0 };
      t.total++;
      if (session.outcome === "NAILED" || session.outcome === "MOSTLY") t.wins++;
      tagMasteryMap.set(session.tagId, t);
    }

    const radarData = Array.from(tagMasteryMap.entries()).map(([tagId, stats]) => ({
      tagId,
      winRate: Math.round((stats.wins / stats.total) * 100),
      totalDrills: stats.total
    }));

    return jsonOk({
      heatmapData,
      radarData,
      totalSessionsLastYear: sessions.length
    });

  } catch (error) {
    return handleApiError(error);
  }
}
