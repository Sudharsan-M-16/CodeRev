import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { createTagSchema } from "@/lib/validations/schemas";
import { slugify } from "@/lib/utils/cn";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const flat = request.nextUrl.searchParams.get("flat") === "true";
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const tags = await prisma.tag.findMany({
      where: search
        ? { userId, name: { contains: search, mode: "insensitive" } }
        : { userId },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { problems: true, children: true } },
      },
      orderBy: [{ name: "asc" }],
    });

    if (flat) {
      return jsonOk(tags);
    }

    // Build tree in response for clients that want nested structure
    type TagRow = (typeof tags)[number] & { children: TagRow[] };
    const byId = new Map<string, TagRow>();
    for (const t of tags) {
      byId.set(t.id, { ...t, children: [] });
    }
    const roots: TagRow[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return jsonOk({ tree: roots, flat: tags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    const data = createTagSchema.parse(body);
    const baseSlug = slugify(data.name);

    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.tag.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const tag = await prisma.tag.create({
      data: {
        userId,
        name: data.name,
        slug,
        color: data.color,
        notes: data.notes ?? null,
        implNotes: data.implNotes ?? null,
        parentId: data.parentId ?? null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { problems: true } },
      },
    });

    return jsonOk(tag, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
