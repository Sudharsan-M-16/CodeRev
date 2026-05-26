import type { Prisma } from "@prisma/client";
import type { ProblemFilterInput } from "@/lib/validations/schemas";

export function buildProblemWhere(
  userId: string,
  filters: Omit<ProblemFilterInput, "sortBy" | "sortOrder" | "page" | "pageSize">
): Prisma.ProblemWhereInput {
  const where: Prisma.ProblemWhereInput = { userId };

  if (filters.search?.trim()) {
    where.title = { contains: filters.search.trim(), mode: "insensitive" };
  }

  if (filters.platforms?.length) {
    where.platform = { in: filters.platforms };
  }

  if (filters.minDiff !== undefined || filters.maxDiff !== undefined) {
    where.normalizedDiff = {
      ...(filters.minDiff !== undefined && { gte: filters.minDiff }),
      ...(filters.maxDiff !== undefined && { lte: filters.maxDiff }),
    };
  }

  if (filters.qualityLabels?.length) {
    where.qualityLabel = { in: filters.qualityLabels };
  }

  if (filters.drillStatus === "due") {
    where.nextDueAt = { lte: new Date() };
  } else if (filters.drillStatus === "never") {
    where.lastDrilledAt = null;
  }

  if (filters.tagIds?.length) {
    if (filters.tagMatch === "all") {
      where.AND = filters.tagIds.map((tagId) => ({
        tags: { some: { tagId } },
      }));
    } else {
      where.tags = { some: { tagId: { in: filters.tagIds } } };
    }
  }

  return where;
}

export function buildProblemOrderBy(
  sortBy: ProblemFilterInput["sortBy"],
  sortOrder: ProblemFilterInput["sortOrder"]
): Prisma.ProblemOrderByWithRelationInput | Prisma.ProblemOrderByWithRelationInput[] {
  const dir = sortOrder;

  switch (sortBy) {
    case "title":
      return { title: dir };
    case "normalizedDiff":
      return { normalizedDiff: dir };
    case "hardest":
      return [{ normalizedDiff: "desc" }, { createdAt: "desc" }];
    case "leastDrilled":
      return [{ lastDrilledAt: "asc" }, { createdAt: "asc" }];
    case "nextDue":
      return [{ nextDueAt: "asc" }, { createdAt: "asc" }];
    case "createdAt":
    default:
      return { createdAt: dir };
  }
}

export const problemInclude = {
  tags: { include: { tag: true } },
  solutionLinks: true,
} satisfies Prisma.ProblemInclude;

export type ProblemWithRelations = Prisma.ProblemGetPayload<{
  include: typeof problemInclude;
}>;
