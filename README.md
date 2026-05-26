# CodeRev - Competitive Programming Knowledge Tracker

Personal LeetCode / Codeforces / AtCoder dashboard with tags, drills, spaced repetition, and PRD-shaped knowledge capture.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 App Router | Server + API routes in one repo |
| Language | TypeScript | Safer refactors as features grow |
| Styling | Tailwind CSS v4 | Fast UI iteration |
| ORM | Prisma | Type-safe queries, migrations |
| Database | PostgreSQL | Relational filters and future pgvector |

## Quick Start

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Folder Structure

```text
src/
  app/                    # Routes (pages + API)
    api/problems/         # CRUD + filtered list
    api/tags/             # Tag tree + CRUD
    api/drills/           # Due queue + DrillSession writes
    problems/             # List + add problem UI
    tags/                 # React Flow hierarchy
    drills/               # Review panel
  components/             # Feature UI
  lib/
    db/                   # Prisma singleton
    validations/          # Zod schemas
    queries/              # Filter builders
    drills/               # Spaced repetition pure functions
  types/                  # Shared TS types
prisma/
  schema.prisma
  seed.ts
```

## Implemented

- Problem intake: platform enum, URL, original rating, normalized difficulty, quality label, summary, notes, implementation notes, invariant, tags, and solution links
- Tags: reusable many-to-many taxonomy with colors, markdown note fields, and parent-child hierarchy
- Drills: IMPLEMENT and MINDSOLVE outcomes written to append-only `DrillSession`
- SRS: PRD fixed-multiplier scheduling with denormalized `lastDrilledAt`, `nextDueAt`, and `currentInterval`
- Filtering: search, platform, difficulty range, quality label, tag AND/OR, drill status, and sort modes
- Tag graph: React Flow visualization of the hierarchy

## Database Notes

The MVP is single-user local, but core rows include `userId` so query scoping can be enforced when auth is added.
