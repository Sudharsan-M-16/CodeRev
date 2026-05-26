import { PrismaClient, Platform, QualityLabel, SolutionLinkType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedUser = await prisma.user.upsert({
    where: { id: "seed_user" },
    create: { id: "seed_user", email: "seed@example.com", firstName: "Seed", lastName: "User" },
    update: {},
  });

  const dp = await prisma.tag.upsert({
    where: { slug: "dynamic-programming" },
    create: {
      name: "Dynamic Programming",
      slug: "dynamic-programming",
      color: "#2563eb",
      notes: "Model overlapping subproblems with a state definition, transition, and base case.",
      userId: seedUser.id,
    },
    update: {},
  });

  const dpOpt = await prisma.tag.upsert({
    where: { slug: "dp-optimization" },
    create: {
      name: "DP Optimization",
      slug: "dp-optimization",
      color: "#7c3aed",
      parentId: dp.id,
      notes: "Reduce transition complexity by exploiting monotonicity, convexity, or interval structure.",
      userId: seedUser.id,
    },
    update: { parentId: dp.id },
  });

  await Promise.all(
    [
      { name: "Divide and Conquer DP", slug: "divide-conquer-dp", parentId: dpOpt.id, color: "#9333ea" },
      { name: "Knuth Optimization", slug: "knuth-optimization", parentId: dpOpt.id, color: "#a855f7" },
      { name: "Graphs", slug: "graphs", color: "#059669" },
      { name: "Binary Search", slug: "binary-search", color: "#0284c7" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        create: { ...tag, userId: seedUser.id },
        update: tag.parentId ? { parentId: tag.parentId } : {},
      })
    )
  );

  const graphs = await prisma.tag.findUniqueOrThrow({ where: { slug: "graphs" } });

  const problem = await prisma.problem.upsert({
    where: { id: "seed-two-sum" },
    create: {
      id: "seed-two-sum",
      userId: seedUser.id,
      title: "Two Sum",
      platform: Platform.LEETCODE,
      url: "https://leetcode.com/problems/two-sum/",
      originalRating: "Easy",
      normalizedDiff: 2,
      qualityLabel: QualityLabel.GREAT,
      summary: "Find two values with a target sum by storing complements in a hash map.",
      notes: "Recognize as a one-pass lookup pattern rather than a nested-loop search.",
      implNotes: "Check the complement before inserting the current value to avoid reusing the same index.",
      tags: { create: [{ tagId: graphs.id }] },
      solutionLinks: {
        create: [
          {
            type: SolutionLinkType.OTHER,
            url: "https://leetcode.com/problems/two-sum/solutions/",
            label: "LeetCode solutions",
          },
        ],
      },
      nextDueAt: new Date(),
      currentInterval: 1,
    },
    update: {},
  });

  console.log("Seeded:", { sampleProblem: problem.title });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
