"use client";

import Link from "next/link";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { TagChip } from "@/components/ui/TagChip";
import type { Problem } from "@/types";

function formatDate(iso: string | null) {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleDateString();
}

export function ProblemList({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        No problems match your filters.{" "}
        <Link href="/problems/new" className="text-indigo-600 underline">
          Add one
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {problems.map((p) => (
        <li
          key={p.id}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {p.title}
                  </a>
                ) : (
                  p.title
                )}
              </h3>
              <p className="text-sm text-zinc-500">
                {p.platform}
                {p.originalRating && ` - ${p.originalRating}`}
                {p.normalizedDiff != null && ` - ${p.normalizedDiff}/10`}
                {p.qualityLabel !== "NONE" && ` - ${p.qualityLabel.replace(/_/g, " ")}`}
              </p>
            </div>
            <DifficultyBadge difficulty={p.normalizedDiff != null ? p.normalizedDiff.toFixed(1) : "UNRATED"} />
          </div>

          {p.summary && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>}

          <div className="mt-2 flex flex-wrap gap-1">
            {p.tags.map(({ tag }) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Next due: {formatDate(p.nextDueAt)}</span>
            <span>Last drilled: {formatDate(p.lastDrilledAt)}</span>
            <span>Interval: {p.currentInterval ?? 0}d</span>
            {p.solutionLinks.length > 0 && <span>Links: {p.solutionLinks.length}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
