"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Select } from "@/components/ui/form";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import type { Problem } from "@/types";

type DrillType = "IMPLEMENT" | "MINDSOLVE";

type DueDrill = {
  id: string;
  drillType: DrillType;
  problem: Problem;
};

type QueueResponse = {
  items: DueDrill[];
  totalDue: number;
  limit: number;
};

const outcomes = [
  { value: "NAILED", label: "Nailed it", desc: "Strong recall" },
  { value: "MOSTLY", label: "Mostly", desc: "Minor gaps" },
  { value: "STRUGGLED", label: "Struggled", desc: "No interval growth" },
  { value: "BLOCKED", label: "Blocked", desc: "Reset to 1 day" },
] as const;

export function DrillReviewPanel() {
  const [queue, setQueue] = useState<QueueResponse>({ items: [], totalDue: 0, limit: 20 });
  const [mode, setMode] = useState<DrillType>("IMPLEMENT");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/drills?due=true&drillType=${mode}`);
    const data = await res.json();
    setQueue(data);
    setLoading(false);
    setStartedAt(Date.now());
  }, [mode]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function review(item: DueDrill, outcome: string) {
    setSubmitting(item.id);
    await fetch("/api/drills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: item.problem.id,
        drillType: mode,
        outcome,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      }),
    });
    setSubmitting(null);
    setRevealed({});
    loadQueue();
  }

  const visibleCount = useMemo(() => Math.min(queue.items.length, queue.limit), [queue]);

  if (loading) return <p className="text-zinc-500">Loading review queue...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Due drills</h2>
          <p className="text-sm text-zinc-500">
            Showing {visibleCount} of {queue.totalDue} overdue
          </p>
        </div>
        <div>
          <label htmlFor="drillMode" className="mb-1 block text-sm font-medium">
            Mode
          </label>
          <Select id="drillMode" value={mode} onChange={(e) => setMode(e.target.value as DrillType)}>
            <option value="IMPLEMENT">Implement</option>
            <option value="MINDSOLVE">Mindsolve</option>
          </Select>
        </div>
      </div>

      {queue.items.length === 0 ? (
        <Card>
          <h3 className="text-lg font-semibold">Review queue</h3>
          <p className="mt-2 text-zinc-500">No drills due right now.</p>
        </Card>
      ) : (
        queue.items.map((item) => {
          const isRevealed = revealed[item.id];
          const firstSolution = item.problem.solutionLinks[0];

          return (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{item.problem.title}</h3>
                  <p className="text-sm text-zinc-500">
                    {mode === "IMPLEMENT" ? "Implement drill" : "Mindsolve drill"} - {item.problem.platform}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Interval: {item.problem.currentInterval ?? 0}d - Last:{" "}
                    {item.problem.lastDrilledAt
                      ? new Date(item.problem.lastDrilledAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
                <DifficultyBadge
                  difficulty={
                    item.problem.normalizedDiff != null ? item.problem.normalizedDiff.toFixed(1) : "UNRATED"
                  }
                />
              </div>

              {mode === "IMPLEMENT" && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.problem.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="rounded-full px-2 py-0.5 text-xs text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {isRevealed && (
                <div className="mt-4 grid gap-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950 lg:grid-cols-2">
                  <div>
                    <h4 className="font-medium">Concept notes</h4>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                      {item.problem.notes || item.problem.summary || "No concept notes stored."}
                    </p>
                  </div>
                  {mode === "IMPLEMENT" && (
                    <div>
                      <h4 className="font-medium">Implementation</h4>
                      <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                        {item.problem.implNotes || "No implementation notes stored."}
                      </p>
                      {firstSolution && (
                        <a
                          href={firstSolution.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-indigo-600 underline"
                        >
                          Open solution
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting === item.id}
                  onClick={() => setRevealed((current) => ({ ...current, [item.id]: true }))}
                >
                  Reveal
                </Button>
                {outcomes.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    variant="secondary"
                    disabled={submitting === item.id}
                    className="flex flex-col items-start gap-0.5 py-3 text-left"
                    onClick={() => review(item, o.value)}
                  >
                    <span className="font-semibold">{o.label}</span>
                    <span className="text-xs font-normal text-zinc-500">{o.desc}</span>
                  </Button>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
