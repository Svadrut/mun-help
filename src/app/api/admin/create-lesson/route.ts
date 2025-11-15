import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { lesson, user, membership } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get the current authenticated user from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, contentMarkdown, schoolId, userId, gradingGuide, type } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Lesson title is required" },
        { status: 400 }
      );
    }

    if (!contentMarkdown || typeof contentMarkdown !== "string") {
      return NextResponse.json(
        { error: "Lesson content is required" },
        { status: 400 }
      );
    }

    // Verify the user exists and belongs to the school
    const currentDbUser = await db
      .select()
      .from(user)
      .where(and(
        eq(user.clerk_id, clerkUser.id),
        eq(user.id, userId),
        eq(user.school_id, schoolId)
      ))
      .limit(1);

    if (currentDbUser.length === 0) {
      return NextResponse.json(
        { error: "User not found or does not belong to this school" },
        { status: 404 }
      );
    }

    // Check if user is an admin
    const userMembership = await db
      .select()
      .from(membership)
      .where(and(
        eq(membership.user_id, userId),
        eq(membership.school_id, schoolId),
        eq(membership.role, "admin")
      ))
      .limit(1);

    if (userMembership.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Create the lesson in the database
    const [newLesson] = await db
      .insert(lesson)
      .values({
        school_id: schoolId,
        created_by: userId,
        title: title.trim(),
        content_markdown: contentMarkdown, // Storing ProseKit JSON as string
        is_published: true,
        grading_guide: gradingGuide,
        type
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        lesson: {
          id: newLesson.id,
          title: newLesson.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create lesson",
      },
      { status: 500 }
    );
  }
}

