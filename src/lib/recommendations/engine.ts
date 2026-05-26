import { prisma } from "@/lib/db/prisma";

export type RecommendedProblem = {
  id: string;
  title: string;
  reason: "DUE_FOR_REVIEW" | "WEAK_AREA" | "CONCEPTUAL_BRIDGE" | "NEW_DISCOVERY";
  score: number;
};

/**
 * Recommendation Engine Heuristics
 * 
 * We synthesize 3 data pipelines to generate a ranked playlist for the user:
 * 1. FSRS Spaced Repetition (Absolute Priority)
 * 2. Tag Mastery Analytics (Targeting Weaknesses)
 * 3. Vector Similarity (Bridging gaps)
 */
export async function generateTargetedPlaylist(userId: string, limit = 10): Promise<RecommendedProblem[]> {
  const recommendations: Map<string, RecommendedProblem> = new Map();

  // 1. HIGH PRIORITY: FSRS Due Problems
  // Any problem whose nextDueAt is in the past MUST be reviewed to halt memory decay.
  const dueProblems = await prisma.problem.findMany({
    where: {
      userId,
      nextDueAt: { lte: new Date() },
    },
    take: 5,
    orderBy: { nextDueAt: "asc" }
  });

  dueProblems.forEach(p => {
    recommendations.set(p.id, {
      id: p.id,
      title: p.title,
      reason: "DUE_FOR_REVIEW",
      score: 100 // Highest baseline score
    });
  });

  // 2. MEDIUM PRIORITY: Weak Area Targeting
  // We query recent drill sessions where the user STRUGGLED or BLOCKED.
  const recentStruggles = await prisma.drillSession.findMany({
    where: {
      userId,
      outcome: { in: ["STRUGGLED", "BLOCKED"] },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    },
    include: { problem: true },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // 3. LOW PRIORITY: Conceptual Bridging (Vector Similarity)
  // If they struggled on problem X, find problem Y (that they haven't seen yet) 
  // that shares deep semantic similarity with X.
  for (const session of recentStruggles) {
    if (!session.problem) continue;

    // Score the struggling problem itself
    if (!recommendations.has(session.problem.id)) {
      recommendations.set(session.problem.id, {
        id: session.problem.id,
        title: session.problem.title,
        reason: "WEAK_AREA",
        score: 80
      });
    }

    // Find a conceptual bridge using pgvector (if embedding exists)
    // We use `$queryRaw` to do a Cosine Distance `<=>` lookup against unattempted problems.
    try {
      const bridges = await prisma.$queryRaw<any[]>`
        SELECT id, title, 1 - (embedding <=> (SELECT embedding FROM "Problem" WHERE id = ${session.problem.id})) as similarity
        FROM "Problem"
        WHERE "userId" = ${userId}
          AND id != ${session.problem.id}
          AND embedding IS NOT NULL
          AND "lastDrilledAt" IS NULL
        ORDER BY embedding <=> (SELECT embedding FROM "Problem" WHERE id = ${session.problem.id})
        LIMIT 1;
      `;

      if (bridges.length > 0) {
        const bridge = bridges[0];
        if (!recommendations.has(bridge.id)) {
          recommendations.set(bridge.id, {
            id: bridge.id,
            title: bridge.title,
            reason: "CONCEPTUAL_BRIDGE",
            score: 60 + (bridge.similarity * 10) // Score based on semantic match
          });
        }
      }
    } catch (err) {
      // Graceful degradation if vectors aren't populated yet
    }
  }

  // Convert map to array and sort by calculated heuristic score
  return Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
