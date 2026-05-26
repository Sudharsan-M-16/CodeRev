import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { createProblemSchema, problemFilterSchema } from "@/lib/validations/schemas";
import {
  buildProblemWhere,
  buildProblemOrderBy,
  problemInclude,
} from "@/lib/queries/problems";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const rawTagIds = request.nextUrl.searchParams.getAll("tagIds");
    const platforms = request.nextUrl.searchParams.getAll("platforms");
    const qualityLabels = request.nextUrl.searchParams.getAll("qualityLabels");

    let expandedTagIds: string[] = [];
    if (rawTagIds.length > 0) {
      const { getTagDescendantIds } = await import("@/lib/queries/tags");
      const sets = await Promise.all(rawTagIds.map(getTagDescendantIds));
      expandedTagIds = Array.from(new Set(sets.flat()));
    }

    const filters = problemFilterSchema.parse({
      ...params,
      tagIds: expandedTagIds.length ? expandedTagIds : undefined,
      platforms: platforms.length ? platforms : undefined,
      qualityLabels: qualityLabels.length ? qualityLabels : undefined,
    });

    const where = buildProblemWhere(userId, filters);
    const skip = (filters.page - 1) * filters.pageSize;

    const [total, problems] = await Promise.all([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        include: problemInclude,
        orderBy: buildProblemOrderBy(filters.sortBy, filters.sortOrder),
        skip,
        take: filters.pageSize,
      }),
    ]);

    return jsonOk({
      items: problems,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
      filters,
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
    const data = createProblemSchema.parse(body);

    const emptyToNull = (v?: string | null) => (v === "" ? null : v ?? null);

    const problem = await prisma.problem.create({
      data: {
        userId,
        title: data.title,
        platform: data.platform,
        url: emptyToNull(data.url),
        originalRating: emptyToNull(data.originalRating),
        normalizedDiff: data.normalizedDiff ?? null,
        qualityLabel: data.qualityLabel,
        summary: emptyToNull(data.summary),
        notes: emptyToNull(data.notes),
        implNotes: emptyToNull(data.implNotes),
        mathInvariant: emptyToNull(data.mathInvariant),
        solutionLinks: {
          create: data.solutionLinks.map((link) => ({
            type: link.type,
            url: link.url,
            language: emptyToNull(link.language),
            label: emptyToNull(link.label),
          })),
        },
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: problemInclude,
    });

    return jsonOk(problem, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
