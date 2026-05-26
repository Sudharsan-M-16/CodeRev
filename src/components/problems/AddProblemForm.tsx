"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea, Card } from "@/components/ui/form";
import { TagPicker } from "@/components/tags/TagPicker";
import type { Platform } from "@/types";

const qualityLabels = ["NONE", "GREAT", "MUST_REVISIT", "ADVANCED"] as const;

export function AddProblemForm() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platforms")
      .then((r) => r.json())
      .then(setPlatforms)
      .catch(() => setError("Failed to load platforms"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const normalizedDiff = String(form.get("normalizedDiff") ?? "");
    const githubUrl = String(form.get("githubSolutionUrl") ?? "");
    const submissionUrl = String(form.get("submissionUrl") ?? "");

    const solutionLinks = [
      githubUrl ? { type: "GITHUB", url: githubUrl } : null,
      submissionUrl ? { type: "SUBMISSION", url: submissionUrl } : null,
    ].filter(Boolean);

    const payload = {
      title: String(form.get("title") ?? ""),
      platform: String(form.get("platform") ?? "CUSTOM"),
      url: String(form.get("url") ?? ""),
      originalRating: String(form.get("originalRating") ?? ""),
      normalizedDiff: normalizedDiff ? Number(normalizedDiff) : null,
      qualityLabel: String(form.get("qualityLabel") ?? "NONE"),
      summary: String(form.get("summary") ?? ""),
      notes: String(form.get("notes") ?? ""),
      implNotes: String(form.get("implNotes") ?? ""),
      mathInvariant: String(form.get("mathInvariant") ?? ""),
      solutionLinks,
      tagIds,
    };

    const res = await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create problem");
      return;
    }

    router.push("/problems");
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Add Problem</h1>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="Two Sum" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="platform">Platform *</Label>
            <Select id="platform" name="platform" required defaultValue="">
              <option value="" disabled>
                Select platform
              </option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qualityLabel">Quality label</Label>
            <Select id="qualityLabel" name="qualityLabel" defaultValue="NONE">
              {qualityLabels.map((label) => (
                <option key={label} value={label}>
                  {label.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="url">Problem URL</Label>
          <Input id="url" name="url" type="url" placeholder="https://leetcode.com/problems/two-sum/" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="originalRating">Original rating</Label>
            <Input id="originalRating" name="originalRating" placeholder="Hard, 1800, ABC-D" />
          </div>
          <div>
            <Label htmlFor="normalizedDiff">Normalized difficulty (1-10)</Label>
            <Input id="normalizedDiff" name="normalizedDiff" type="number" min={1} max={10} step="0.1" />
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <TagPicker selectedIds={tagIds} onChange={setTagIds} />
        </div>

        <div>
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" name="summary" rows={2} placeholder="One or two sentence reduction." />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="notes">Concept notes</Label>
            <Textarea id="notes" name="notes" rows={5} placeholder="Pattern, reduction, invariant intuition..." />
          </div>
          <div>
            <Label htmlFor="implNotes">Implementation notes</Label>
            <Textarea id="implNotes" name="implNotes" rows={5} placeholder="Indexing, template, overflow, modulo..." />
          </div>
        </div>

        <div>
          <Label htmlFor="mathInvariant">Math invariant</Label>
          <Textarea id="mathInvariant" name="mathInvariant" rows={3} placeholder="Formal invariant, LaTeX allowed." />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="githubSolutionUrl">GitHub solution</Label>
            <Input id="githubSolutionUrl" name="githubSolutionUrl" type="url" />
          </div>
          <div>
            <Label htmlFor="submissionUrl">Submission link</Label>
            <Input id="submissionUrl" name="submissionUrl" type="url" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save problem"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
