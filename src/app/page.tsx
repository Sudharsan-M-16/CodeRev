import Link from "next/link";
import { Button } from "@/components/ui/form";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-bold tracking-tight">Competitive programming knowledge base</h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Track problems across LeetCode, Codeforces, and more. Tag by topic, run implement &
          mindsolve drills, and use spaced repetition so patterns stick.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/problems/new">
            <Button>Add problem</Button>
          </Link>
          <Link href="/problems">
            <Button variant="secondary">Browse problems</Button>
          </Link>
          <Link href="/drills">
            <Button variant="secondary">Review drills</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Problems & tags",
            body: "Many-to-many tags with colors, notes, and parent-child hierarchies.",
          },
          {
            title: "Drills & SRS",
            body: "Separate implement and mindsolve reviews with fixed, auditable intervals.",
          },
          {
            title: "AI-ready",
            body: "Embedding table and summary fields for future auto-tagging and recommendations.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{card.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
