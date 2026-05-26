"use client";

import { cn } from "@/lib/utils/cn";

const variants: Record<string, string> = {
  EASY: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  HARD: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  EXPERT: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        variants[difficulty] ?? "bg-zinc-500/15 text-zinc-600",
        className
      )}
    >
      {difficulty}
    </span>
  );
}
