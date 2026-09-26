import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { Grade, Rubric } from "@/lib/schemas";
import { checkPassword, errorResponse, model } from "@/lib/server";

export const maxDuration = 300;

// Body: form data with `file` (one student PDF), `rubric` (JSON) and optional `instructions`.
export async function POST(request: Request) {
  const denied = checkPassword(request);
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const rubric = Rubric.parse(JSON.parse(String(form.get("rubric"))));
    const instructions = String(form.get("instructions") ?? "").trim();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF" }, { status: 400 });
    }

    const criteria = rubric.criteria
      .map((c) => `- id "${c.id}": ${c.name} (0 to ${c.maxPoints} points). ${c.description}`)
      .join("\n");

    const { output } = await generateText({
      model,
      maxRetries: 5, // backs off on rate limits when a big batch is running
      output: Output.object({ schema: Grade }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are grading a student's "${rubric.title}" for a teacher.

1. Find the student's name. Look in the header, title page, lines like "Delegate: Name" or "Submitted by", and signatures. Ignore names that are not the author, such as the teacher, cited sources, or people quoted in the text. The original filename is "${file.name}". Use it only as a fallback (set nameSource to "filename"). If you cannot find a name, return null with nameSource "not_found".

2. Score every criterion below with whole numbers. Return exactly one score per criterion id.
${criteria}

3. Write two to four sentences of overall feedback addressed to the student.

4. List anything the teacher should check by hand in "issues": unreadable pages, a different assignment than expected, several authors, missing sections.
${instructions ? `\nExtra instructions from the teacher:\n${instructions}` : ""}`,
            },
            {
              type: "file",
              data: new Uint8Array(await file.arrayBuffer()),
              mediaType: "application/pdf",
              filename: file.name,
            },
          ],
        },
      ],
    });

    // Keep exactly one clamped score per rubric criterion, whatever the model returned.
    const scores = rubric.criteria.map((c) => {
      const s = output.scores.find((s) => s.criterionId === c.id);
      return {
        criterionId: c.id,
        points: Math.min(c.maxPoints, Math.max(0, Math.round(s?.points ?? 0))),
        justification: s?.justification ?? "Not scored by the model.",
      };
    });
    const skipped = rubric.criteria.filter((c) => !output.scores.some((s) => s.criterionId === c.id));
    const issues = skipped.length
      ? [...output.issues, `Model skipped: ${skipped.map((c) => c.name).join(", ")}`]
      : output.issues;

    return NextResponse.json({ ...output, scores, issues } satisfies Grade);
  } catch (error) {
    return errorResponse(error);
  }
}
