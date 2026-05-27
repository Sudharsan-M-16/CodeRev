import { z } from "zod";

export const platformSchema = z.enum(["LEETCODE", "CODEFORCES", "ATCODER", "CUSTOM"]);
export const qualityLabelSchema = z.enum(["NONE", "GREAT", "MUST_REVISIT", "ADVANCED"]);
export const solutionLinkTypeSchema = z.enum(["GITHUB", "SUBMISSION", "OTHER"]);
export const drillTypeSchema = z.enum(["IMPLEMENT", "MINDSOLVE"]);
export const drillOutcomeSchema = z.enum(["NAILED", "MOSTLY", "STRUGGLED", "BLOCKED"]);

const optionalUrlSchema = z.string().url("Must be a valid URL").optional().or(z.literal(""));
const optionalText = (max: number) => z.string().max(max).optional().nullable();

export const solutionLinkSchema = z.object({
  id: z.string().cuid().optional(),
  type: solutionLinkTypeSchema.default("OTHER"),
  url: z.string().url("Must be a valid URL"),
  language: z.string().max(50).optional().nullable(),
  label: z.string().max(100).optional().nullable(),
});

export const createProblemSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  platform: platformSchema,
  url: optionalUrlSchema,
  originalRating: z.string().max(40).optional().nullable(),
  normalizedDiff: z.number().min(1).max(10).optional().nullable(),
  qualityLabel: qualityLabelSchema.default("NONE"),
  summary: optionalText(500),
  notes: optionalText(10000),
  implNotes: optionalText(10000),
  mathInvariant: optionalText(10000),
  solutionLinks: z.array(solutionLinkSchema).default([]),
  tagIds: z.array(z.string().cuid()).default([]),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const updateProblemSchema = createProblemSchema.partial();
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be hex e.g. #2563eb")
    .default("#2563eb"),
  notes: optionalText(10000),
  implNotes: optionalText(10000),
  parentId: z.string().cuid().optional().nullable(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = createTagSchema.partial();
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

export const reviewDrillSchema = z
  .object({
    problemId: z.string().cuid().optional(),
    tagId: z.string().cuid().optional(),
    drillType: drillTypeSchema,
    outcome: drillOutcomeSchema,
    durationSeconds: z.number().int().min(0).optional().nullable(),
    clientSessionId: z.string().optional(),
  })
  .refine((value) => Boolean(value.problemId) !== Boolean(value.tagId), {
    message: "Exactly one of problemId or tagId is required",
  });

export type ReviewDrillInput = z.infer<typeof reviewDrillSchema>;

export const problemFilterSchema = z.object({
  search: z.string().optional(),
  platforms: z.array(platformSchema).optional(),
  minDiff: z.coerce.number().min(1).max(10).optional(),
  maxDiff: z.coerce.number().min(1).max(10).optional(),
  qualityLabels: z.array(qualityLabelSchema).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  tagMatch: z.enum(["any", "all"]).default("any"),
  drillStatus: z.enum(["all", "due", "never"]).default("all"),
  sortBy: z
    .enum(["createdAt", "title", "normalizedDiff", "leastDrilled", "hardest", "nextDue"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProblemFilterInput = z.infer<typeof problemFilterSchema>;
