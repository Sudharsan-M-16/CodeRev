export type Platform = {
  id: "LEETCODE" | "CODEFORCES" | "ATCODER" | "CUSTOM";
  name: string;
  slug: string;
};

export type TagSummary = {
  id: string;
  name: string;
  slug: string;
  color: string;
  parentId: string | null;
  drillCount: number;
  lastDrilledAt: string | null;
};

export type SolutionLink = {
  id: string;
  type: "GITHUB" | "SUBMISSION" | "OTHER";
  url: string;
  language: string | null;
  label: string | null;
};

export type Problem = {
  id: string;
  title: string;
  platform: Platform["id"];
  url: string | null;
  originalRating: string | null;
  normalizedDiff: number | null;
  qualityLabel: "NONE" | "GREAT" | "MUST_REVISIT" | "ADVANCED";
  summary: string | null;
  notes: string | null;
  implNotes: string | null;
  mathInvariant: string | null;
  lastDrilledAt: string | null;
  nextDueAt: string | null;
  currentInterval: number | null;
  solutionLinks: SolutionLink[];
  tags: { tag: TagSummary }[];
  createdAt: string;
};

export type PaginatedProblems = {
  items: Problem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TagWithMeta = TagSummary & {
  notes: string | null;
  implNotes: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  _count?: { problems: number; children?: number };
  children?: TagWithMeta[];
};
