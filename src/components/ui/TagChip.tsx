"use client";

import type { TagSummary } from "@/types";

export function TagChip({ tag }: { tag: TagSummary }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: tag.color }}
      title={tag.lastDrilledAt ? `Last drilled: ${new Date(tag.lastDrilledAt).toLocaleDateString()}` : "Not drilled"}
    >
      {tag.name}
    </span>
  );
}
