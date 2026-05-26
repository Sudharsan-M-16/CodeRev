"use client";

import { useState } from "react";
import { Button, Input, Label, Card, Textarea } from "@/components/ui/form";

export function CreateTagForm({ onCreated }: { onCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      color: String(form.get("color") ?? "#2563eb"),
      notes: String(form.get("notes") ?? "") || null,
      implNotes: String(form.get("implNotes") ?? "") || null,
      parentId: String(form.get("parentId") ?? "") || null,
    };

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create tag");
      return;
    }

    e.currentTarget.reset();
    onCreated?.();
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Create tag</h2>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Dynamic Programming" />
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" type="color" defaultValue="#2563eb" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Algorithm notes</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Template, prerequisites, core idea..." />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="implNotes">Implementation notes</Label>
          <Textarea id="implNotes" name="implNotes" rows={3} placeholder="Common edge cases and gotchas..." />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create tag"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
