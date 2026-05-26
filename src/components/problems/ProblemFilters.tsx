"use client";

import { useCallback, useEffect, useState } from "react";
import { Input, Select, Label, Button } from "@/components/ui/form";
import type { Platform, TagWithMeta } from "@/types";

export type ProblemFiltersState = {
  search: string;
  platforms: string[];
  minDiff: string;
  maxDiff: string;
  qualityLabels: string[];
  tagIds: string[];
  tagMatch: "any" | "all";
  drillStatus: "all" | "due" | "never";
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export const defaultFilters: ProblemFiltersState = {
  search: "",
  platforms: [],
  minDiff: "",
  maxDiff: "",
  qualityLabels: [],
  tagIds: [],
  tagMatch: "any",
  drillStatus: "all",
  sortBy: "createdAt",
  sortOrder: "desc",
};

interface ProblemFiltersProps {
  value: ProblemFiltersState;
  onChange: (next: ProblemFiltersState) => void;
}

const qualityLabels = ["NONE", "GREAT", "MUST_REVISIT", "ADVANCED"];

export function ProblemFilters({ value, onChange }: ProblemFiltersProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [tags, setTags] = useState<TagWithMeta[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/platforms").then((r) => r.json()),
      fetch("/api/tags?flat=true").then((r) => r.json()),
    ]).then(([p, t]) => {
      setPlatforms(p);
      setTags(t);
    });
  }, []);

  const patch = useCallback(
    (partial: Partial<ProblemFiltersState>) => onChange({ ...value, ...partial }),
    [onChange, value]
  );

  function toggleInList(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="search">Search title</Label>
          <Input
            id="search"
            value={value.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Two Sum..."
          />
        </div>
        <div>
          <Label htmlFor="sortBy">Sort by</Label>
          <Select id="sortBy" value={value.sortBy} onChange={(e) => patch({ sortBy: e.target.value })}>
            <option value="createdAt">Recently added</option>
            <option value="title">Title</option>
            <option value="normalizedDiff">Normalized difficulty</option>
            <option value="leastDrilled">Least drilled</option>
            <option value="hardest">Hardest</option>
            <option value="nextDue">Next due</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="sortOrder">Order</Label>
          <Select
            id="sortOrder"
            value={value.sortOrder}
            onChange={(e) => patch({ sortOrder: e.target.value as "asc" | "desc" })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="drillStatus">Drill status</Label>
          <Select
            id="drillStatus"
            value={value.drillStatus}
            onChange={(e) => patch({ drillStatus: e.target.value as ProblemFiltersState["drillStatus"] })}
          >
            <option value="all">All</option>
            <option value="due">Due now</option>
            <option value="never">Never drilled</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="minDiff">Min difficulty</Label>
          <Input
            id="minDiff"
            type="number"
            min={1}
            max={10}
            step="0.1"
            value={value.minDiff}
            onChange={(e) => patch({ minDiff: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="maxDiff">Max difficulty</Label>
          <Input
            id="maxDiff"
            type="number"
            min={1}
            max={10}
            step="0.1"
            value={value.maxDiff}
            onChange={(e) => patch({ maxDiff: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="tagMatch">Tag match</Label>
          <Select
            id="tagMatch"
            value={value.tagMatch}
            onChange={(e) => patch({ tagMatch: e.target.value as "any" | "all" })}
          >
            <option value="any">Any tag (OR)</option>
            <option value="all">All tags (AND)</option>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Platforms</p>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant={value.platforms.includes(p.id) ? "primary" : "secondary"}
              className="px-3 py-1 text-xs"
              onClick={() => patch({ platforms: toggleInList(value.platforms, p.id) })}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Quality</p>
        <div className="flex flex-wrap gap-2">
          {qualityLabels.map((label) => (
            <Button
              key={label}
              type="button"
              variant={value.qualityLabels.includes(label) ? "primary" : "secondary"}
              className="px-3 py-1 text-xs"
              onClick={() => patch({ qualityLabels: toggleInList(value.qualityLabels, label) })}
            >
              {label.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags</p>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => patch({ tagIds: toggleInList(value.tagIds, t.id) })}
              className="rounded-full px-2 py-0.5 text-xs text-white ring-2 ring-transparent transition"
              style={{
                backgroundColor: t.color,
                boxShadow: value.tagIds.includes(t.id) ? "0 0 0 2px white" : undefined,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <Button type="button" variant="ghost" className="text-xs" onClick={() => onChange(defaultFilters)}>
        Reset filters
      </Button>
    </div>
  );
}
