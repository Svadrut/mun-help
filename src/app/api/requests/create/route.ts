import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { joinRequest } from "@/src/db/schema";
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
    const { schoolId } = body;

    if (!schoolId || typeof schoolId !== "number") {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for this school
    const existingRequest = await db
      .select()
      .from(joinRequest)
      .where(and(
        eq(joinRequest.clerk_id, clerkUser.id),
        eq(joinRequest.school_id, schoolId),
        eq(joinRequest.status, "pending")
      ))
      .limit(1);

    if (existingRequest.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending request for this school" },
        { status: 400 }
      );
    }

    // Get user's name and email from Clerk
    const userName = clerkUser.firstName || clerkUser.username || "User";
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "";

    if (!userEmail) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Create the join request
    const [newRequest] = await db
      .insert(joinRequest)
      .values({
        school_id: schoolId,
        name: userName,
        email: userEmail,
        clerk_id: clerkUser.id,
        status: "pending",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        request: {
          id: newRequest.id,
          schoolId: newRequest.school_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create request",
      },
      { status: 500 }
    );
  }
}

