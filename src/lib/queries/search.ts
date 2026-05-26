import { prisma } from "@/lib/db/prisma";

export type SearchResult = {
  id: string;
  type: "PROBLEM" | "TAG";
  title: string;
  relevance: number;
};

/**
 * Performs a Full-Text Fuzzy Search across Problems and Tags using PostgreSQL Trigram Indexes (pg_trgm).
 * 
 * Why Trigrams?
 * Trigrams break strings down into 3-letter tokens. This allows us to catch typos 
 * (e.g. searching "dijkstra" and "dijstra" will have a high trigram similarity).
 * 
 * Prisma doesn't natively support sorting by `<->` (trigram distance) dynamically without raw SQL.
 */
export async function performFuzzySearch(userId: string, query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  // 1. Search Problems
  // The `<->` operator calculates the distance between the query and the target string.
  // We filter by similarity (`> 0.1` threshold) and sort by the smallest distance.
  const problems = await prisma.$queryRaw<any[]>`
    SELECT 
      id, 
      title, 
      'PROBLEM' as type,
      1 - (title <-> ${query}) as relevance
    FROM "Problem"
    WHERE 
      "userId" = ${userId} 
      AND (title % ${query} OR summary % ${query})
    ORDER BY title <-> ${query} ASC
    LIMIT 10;
  `;

  // 2. Search Tags
  const tags = await prisma.$queryRaw<any[]>`
    SELECT 
      id, 
      name as title, 
      'TAG' as type,
      1 - (name <-> ${query}) as relevance
    FROM "Tag"
    WHERE 
      "userId" = ${userId} 
      AND (name % ${query} OR notes % ${query})
    ORDER BY name <-> ${query} ASC
    LIMIT 10;
  `;

  // Combine and sort globally by highest relevance
  const combined = [...problems, ...tags].sort((a, b) => b.relevance - a.relevance);
  
  return combined.slice(0, 10);
}
