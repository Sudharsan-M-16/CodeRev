import { prisma } from "@/lib/db/prisma";

export interface TagTreeNode {
  id: string;
  name: string;
  slug: string;
  color: string;
  notes: string | null;
  implNotes: string | null;
  parentId: string | null;
  children: TagTreeNode[];
}

export async function getTagTree(): Promise<TagTreeNode[]> {
  const tags = await prisma.tag.findMany({
    where: { userId: "local" },
    orderBy: [{ name: "asc" }],
  });

  const byId = new Map<string, TagTreeNode>();

  for (const tag of tags) {
    byId.set(tag.id, {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      notes: tag.notes,
      implNotes: tag.implNotes,
      parentId: tag.parentId,
      children: [],
    });
  }

  const roots: TagTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getTagsFlatWithDepth() {
  const tree = await getTagTree();
  type FlatTag = TagTreeNode & { depth: number };
  const flat: FlatTag[] = [];

  function walk(nodes: TagTreeNode[], depth: number) {
    for (const node of nodes) {
      flat.push({ ...node, depth });
      walk(node.children, depth + 1);
    }
  }

  walk(tree, 0);
  return flat;
}

export async function getTagDescendantIds(tagId: string): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: { userId: "local" },
    select: { id: true, parentId: true },
  });
  const childrenMap = new Map<string | null, string[]>();

  for (const t of tags) {
    const key = t.parentId;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(t.id);
  }

  const result: string[] = [];

  function collect(id: string) {
    result.push(id);
    for (const childId of childrenMap.get(id) ?? []) {
      collect(childId);
    }
  }

  collect(tagId);
  return result;
}
