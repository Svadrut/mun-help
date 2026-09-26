import { z } from "zod";

export const Criterion = z.object({
  id: z.string().describe("short lowercase slug, e.g. research"),
  name: z.string(),
  maxPoints: z.number().int().positive(),
  description: z.string().describe("what full marks looks like"),
});
export type Criterion = z.infer<typeof Criterion>;

export const Rubric = z.object({
  title: z.string().describe("short name for the assignment, e.g. Position Paper"),
  criteria: z.array(Criterion).min(1),
});
export type Rubric = z.infer<typeof Rubric>;

export const NAME_SOURCES = [
  "header",
  "title_page",
  "signature",
  "body",
  "filename",
  "not_found",
] as const;

export const Grade = z.object({
  studentName: z.string().nullable(),
  nameSource: z.enum(NAME_SOURCES),
  nameConfidence: z.enum(["high", "medium", "low"]),
  scores: z.array(
    z.object({
      criterionId: z.string(),
      points: z.number(),
      justification: z.string().describe("one or two sentences that cite the paper"),
    })
  ),
  overallFeedback: z.string(),
  issues: z
    .array(z.string())
    .describe("problems a teacher should check, e.g. blank pages or the wrong assignment. Empty if none."),
});
export type Grade = z.infer<typeof Grade>;
