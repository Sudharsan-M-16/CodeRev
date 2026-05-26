"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { TagWithMeta } from "@/types";

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<TagWithMeta[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/tags?flat=true")
      .then((r) => r.json())
      .then(setTags)
      .catch(console.error);
  }, []);

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
        {filtered.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium text-white transition ring-2 ring-transparent",
                selected && "ring-white/80 ring-offset-2 ring-offset-zinc-900"
              )}
              style={{ backgroundColor: tag.color }}
              title={`${tag._count?.problems ?? 0} problems`}
            >
              {tag.name}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span className="text-sm text-zinc-500">No tags found</span>
        )}
      </div>
    </div>
  );
}
