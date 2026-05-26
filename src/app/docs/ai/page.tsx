export default function AiRoadmapPage() {
  return (
    <article className="prose prose-zinc max-w-none dark:prose-invert">
      <h1>AI features roadmap</h1>
      <p>
        CodeRev keeps Phase 1 deterministic. AI features belong after the problem archive, tag
        graph, drill sessions, and SRS loop are reliable.
      </p>

      <h2>Phase 5 candidates</h2>
      <ul>
        <li>
          <strong>Auto-tag suggestions</strong> - read title, summary, notes, and existing tags;
          return candidate tag slugs for user confirmation.
        </li>
        <li>
          <strong>Editorial summarization</strong> - produce a short summary field, never a raw
          editorial copy.
        </li>
        <li>
          <strong>Weak-area detection</strong> - SQL over <code>DrillSession</code> outcomes by tag
          and drill type.
        </li>
        <li>
          <strong>Similar problems</strong> - use pgvector embeddings once the corpus is large
          enough to make nearest-neighbor search useful.
        </li>
      </ul>

      <h2>Architecture</h2>
      <pre>{`src/lib/ai/
  suggest-tags.ts
  summarize.ts
  weak-areas.ts
  embeddings.ts

src/app/api/ai/
  suggest-tags/route.ts
  similar/route.ts`}</pre>

      <p>
        Run AI writes asynchronously so problem creation and drill review stay fast. AI should pick
        candidates; deterministic SRS continues to own scheduling.
      </p>
    </article>
  );
}
