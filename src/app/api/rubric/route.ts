import { generateText, Output, type UserContent } from "ai";
import { NextResponse } from "next/server";
import { Rubric } from "@/lib/schemas";
import { checkPassword, errorResponse, model } from "@/lib/server";

export const maxDuration = 120;

// Body: form data with `text` (pasted rubric) and/or `file` (rubric PDF).
export async function POST(request: Request) {
  const denied = checkPassword(request);
  if (denied) return denied;

  try {
    const form = await request.formData();
    const text = form.get("text");
    const file = form.get("file");

    const content: UserContent = [
      {
        type: "text",
        text: `Convert this grading rubric into a list of criteria. Keep the teacher's criterion names and point values exactly. If the rubric gives levels (e.g. Excellent/Good/Poor), fold them into the description so a grader knows what earns full, partial and low marks. If no point values are given, choose sensible whole numbers.`,
      },
    ];
    if (typeof text === "string" && text.trim()) content.push({ type: "text", text });
    if (file instanceof File) {
      content.push({
        type: "file",
        data: new Uint8Array(await file.arrayBuffer()),
        mediaType: file.type || "application/pdf",
        filename: file.name,
      });
    }
    if (content.length === 1) {
      return NextResponse.json({ error: "Paste a rubric or upload one" }, { status: 400 });
    }

    const { output } = await generateText({
      model,
      output: Output.object({ schema: Rubric }),
      messages: [{ role: "user", content }],
    });
    return NextResponse.json(output);
  } catch (error) {
    return errorResponse(error);
  }
}
