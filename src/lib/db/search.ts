import { prisma } from "./prisma";

export type SearchResult = {
  id: string;
  type: "PROBLEM" | "TAG";
  title: string;
  relevance: number;
};

/**
 * Performs a Full-Text Fuzzy Search across Problems and Tags using PostgreSQL Trigram Indexes (pg_trgm).
 * It uses strict_word_similarity to ensure high relevance ranking based on word matching,
 * gracefully handling typos and partial matches.
 */
export async function performFuzzySearch(userId: string, query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const sanitizedQuery = query.trim();

  // 1. Search Problems using strict_word_similarity for better multi-word matching
  const problems = await prisma.$queryRaw<any[]>`
    SELECT 
      id, 
      title, 
      'PROBLEM' as type,
      GREATEST(
        strict_word_similarity(${sanitizedQuery}, title),
        strict_word_similarity(${sanitizedQuery}, COALESCE(notes, ''))
      ) as relevance
    FROM "Problem"
    WHERE 
      "userId" = ${userId} 
      AND (
        title % ${sanitizedQuery} 
        OR notes % ${sanitizedQuery}
      )
    ORDER BY relevance DESC
    LIMIT 10;
  `;

  // 2. Search Tags 
  const tags = await prisma.$queryRaw<any[]>`
    SELECT 
      id, 
      name as title, 
      'TAG' as type,
      GREATEST(
        strict_word_similarity(${sanitizedQuery}, name),
        strict_word_similarity(${sanitizedQuery}, COALESCE(notes, ''))
      ) as relevance
    FROM "Tag"
    WHERE 
      "userId" = ${userId} 
      AND (
        name % ${sanitizedQuery} 
        OR notes % ${sanitizedQuery}
      )
    ORDER BY relevance DESC
    LIMIT 5;
  `;

  // Combine and sort globally by highest relevance
  const combined = [...problems, ...tags].sort((a, b) => b.relevance - a.relevance);
  
  return combined.slice(0, 10);
}
