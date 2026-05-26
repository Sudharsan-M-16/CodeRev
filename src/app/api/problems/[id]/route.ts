import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { updateProblemSchema } from "@/lib/validations/schemas";
import { problemInclude } from "@/lib/queries/problems";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: problemInclude,
    });

    if (!problem) return jsonError("Problem not found", 404);
    return jsonOk(problem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = updateProblemSchema.parse(body);

    const emptyToNull = (v?: string | null) => (v === "" ? null : v);

    const problem = await prisma.$transaction(async (tx) => {
      if (data.tagIds !== undefined) {
        await tx.problemTag.deleteMany({ where: { problemId: id } });
        if (data.tagIds.length) {
          await tx.problemTag.createMany({
            data: data.tagIds.map((tagId) => ({ problemId: id, tagId })),
          });
        }
      }

      if (data.solutionLinks !== undefined) {
        await tx.solutionLink.deleteMany({ where: { problemId: id } });
        if (data.solutionLinks.length) {
          await tx.solutionLink.createMany({
            data: data.solutionLinks.map((link) => ({
              problemId: id,
              type: link.type,
              url: link.url,
              language: emptyToNull(link.language) ?? null,
              label: emptyToNull(link.label) ?? null,
            })),
          });
        }
      }

      return tx.problem.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.platform !== undefined && { platform: data.platform }),
          ...(data.url !== undefined && { url: emptyToNull(data.url) }),
          ...(data.originalRating !== undefined && { originalRating: emptyToNull(data.originalRating) }),
          ...(data.normalizedDiff !== undefined && { normalizedDiff: data.normalizedDiff }),
          ...(data.qualityLabel !== undefined && { qualityLabel: data.qualityLabel }),
          ...(data.summary !== undefined && { summary: emptyToNull(data.summary) }),
          ...(data.notes !== undefined && { notes: emptyToNull(data.notes) }),
          ...(data.implNotes !== undefined && { implNotes: emptyToNull(data.implNotes) }),
          ...(data.mathInvariant !== undefined && { mathInvariant: emptyToNull(data.mathInvariant) }),
        },
        include: problemInclude,
      });
    });

    return jsonOk(problem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.problem.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
