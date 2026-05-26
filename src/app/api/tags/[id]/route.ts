import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { updateTagSchema } from "@/lib/validations/schemas";
import { getTagDescendantIds } from "@/lib/queries/tags";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const includeDescendants = true;
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { problems: true } },
      },
    });

    if (!tag) return jsonError("Tag not found", 404);

    const descendantIds = includeDescendants ? await getTagDescendantIds(id) : [id];

    return jsonOk({ ...tag, descendantIds });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = updateTagSchema.parse(body);

    if (data.parentId === id) {
      return jsonError("Tag cannot be its own parent", 400);
    }

    if (data.parentId) {
      let currentId: string | null = data.parentId;
      let depth = 0;

      while (currentId && depth < 20) {
        if (currentId === id) {
          return jsonError("Circular dependency detected", 422);
        }

        const parent: { parentId: string | null } | null = await prisma.tag.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
        currentId = parent?.parentId ?? null;
        depth += 1;
      }

      if (depth >= 20) {
        return jsonError("Tag hierarchy depth limit exceeded", 422);
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.implNotes !== undefined && { implNotes: data.implNotes }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });

    return jsonOk(tag);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const childCount = await prisma.tag.count({ where: { parentId: id } });
    if (childCount > 0) {
      return jsonError("Delete child tags or re-parent them first", 409);
    }

    await prisma.tag.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
