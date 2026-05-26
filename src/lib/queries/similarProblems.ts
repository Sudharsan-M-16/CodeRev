import { prisma } from "@/lib/db/prisma";
import type { Problem } from "@prisma/client";

export async function findSimilarProblems(
  currentProblemEmbedding: number[],
  userId: string,
  limit: number = 3
): Promise<Problem[]> {
  if (currentProblemEmbedding.length !== 1536) {
    throw new Error(
      `Vector dimension mismatch. Expected 1536, got ${currentProblemEmbedding.length}. Ensure you are using text-embedding-3-small.`
    );
  }

  // Format array to pgvector string format: '[0.1, 0.2, ...]'
  const embeddingString = `[${currentProblemEmbedding.join(",")}]`;

  // Use raw SQL with cosine distance (<=>) for similarity matching
  // Cast the string to vector to ensure pgvector understands it
  const similarProblems = await prisma.$queryRaw<Problem[]>`
    SELECT id, "userId", title, platform, url, "originalRating", "normalizedDiff", 
           "qualityLabel", summary, notes, "implNotes", "mathInvariant", 
           "lastDrilledAt", "nextDueAt", "currentInterval", "createdAt", "updatedAt"
    FROM "Problem"
    WHERE "userId" = ${userId} 
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingString}::vector
    LIMIT ${limit};
  `;

  return similarProblems;
}
