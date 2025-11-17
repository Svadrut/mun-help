import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { lesson, user, membership, submission, grade } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe, generateObject } from "ai";
import { saveAsMarkdown } from "../../lessons/[...id]/page";
import { NodeJSON } from "prosekit/core";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // set in .env.local
});

export async function POST(request: Request) {
  try {
    // Get the current authenticated user from Clerk
    const clerkUser = await currentUser();
    console.log("HASDHFASKDHFAKHSDFKASDFHASKDHFAHSDKF")

    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { audioUrl, content, id, userId, schoolId, type } = body;
    
    console.log("BOBBBBB" + JSON.stringify(body))

    if (
      !audioUrl ||
      (typeof audioUrl !== "string" && (type === "speaking" || type === "both"))
    ) {
        console.log("HEYYYYYY")
      return NextResponse.json(
        { error: "Submission audio is required" },
        { status: 400 }
      );
    }

    if (
      (!content || typeof content !== "object") &&
      (type === "writing" || type === "both")
    ) {
        console.log(body.content)
      return NextResponse.json(
        { error: "Submission content is required" },
        { status: 400 }
      );
    }

    // Verify the user exists and belongs to the school
    const currentDbUser = await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.clerk_id, clerkUser.id),
          eq(user.id, userId),
          eq(user.school_id, schoolId)
        )
      )
      .limit(1);

    if (currentDbUser.length === 0) {
      return NextResponse.json(
        { error: "User not found or does not belong to this school" },
        { status: 404 }
      );
    }

    console.log("ASDFKASDFKJASDF HERE I AM")

    // Create the lesson in the database
    const [result] = await db
      .insert(submission)
      .values({
        lesson_id: id,
        user_id: userId,
        media_url: audioUrl,
        status: "submitted",
      })
      .returning();

    const [currentLesson] = await db
      .select()
      .from(lesson)
      .where(eq(lesson.id, id));

    let transcription;
    if (audioUrl !== null || audioUrl !== undefined) {
      transcription = await transcribe({
        model: openai.transcription("gpt-4o-mini-transcribe"),
        audio: new URL(audioUrl),
        providerOptions: { openai: { language: "en" } },
      });
    }

    console.log(transcription?.text);

    const completion = await generateObject({
      model: openai.chat("gpt-5-mini"),
      prompt: `You are a grading helper for a MUN teacher. Your job is to either grade speeches said by a student (transcription and duration of speech provided) and/or a written assignment (such as a resolution).
               You will be provided with the lesson given to the student, the instructions for the student's activity, and a grading guide written by the teacher about how you, the MUN assistant, should grade.
               You may or may not be provided a transcription or a written assignment. Score out of 100, using whole numbers only.

               ${
                 audioUrl !== null ||
                 (audioUrl !== undefined &&
                   `Transcription: ${transcription?.text}. Duration ${transcription?.durationInSeconds}`)
               }
               ${
                 content !== null &&
                 `Written content: ${saveAsMarkdown(content)}`
               }
               
               Lesson: ${saveAsMarkdown(
                 JSON.parse(currentLesson.content_markdown)
               )}
               Activity instructions: ${saveAsMarkdown(
                 JSON.parse(currentLesson.instructions)
               )}
               Grading Guide: ${saveAsMarkdown(
                 JSON.parse(
                   currentLesson.grading_guide
                     ? currentLesson.grading_guide
                     : ""
                 )
               )}
      `,
      schema: z.object({
        score: z.number(),
        feedback: z.string(),
      }),
      providerOptions: {
        openai: {
          reasoning: {
            effort: "low",
          },
        },
      },
    });

    const [grades] = await db
      .insert(grade)
      .values({
        lesson_id: currentLesson.id,
        submission_id: result.id,
        user_id: userId,
        ai_comments: completion.object.feedback,
        score: completion.object.score,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        submission: {
          id: result.id,
        },
        grade: {
          id: grades.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create submission",
      },
      { status: 500 }
    );
  }
}
