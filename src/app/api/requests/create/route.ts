import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { joinRequest, user, membership } from "@/src/db/schema";
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

    // Create the join request with approved status (auto-approved)
    const [newRequest] = await db
      .insert(joinRequest)
      .values({
        school_id: schoolId,
        name: userName,
        email: userEmail,
        clerk_id: clerkUser.id,
        status: "approved",
      })
      .returning();

    // Automatically create/update user and membership
    // Check if user already exists in the database
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.clerk_id, clerkUser.id))
      .limit(1);

    let userId: number;

    if (existingUser.length > 0) {
      // Update existing user with new school_id
      const [updatedUser] = await db
        .update(user)
        .set({
          school_id: schoolId,
          email: userEmail,
          display_name: userName,
          updated_at: new Date(),
        })
        .where(eq(user.id, existingUser[0].id))
        .returning();

      userId = updatedUser.id;
    } else {
      // Create new user record
      const [newUser] = await db
        .insert(user)
        .values({
          clerk_id: clerkUser.id,
          school_id: schoolId,
          email: userEmail,
          display_name: userName,
        })
        .returning();

      userId = newUser.id;
    }

    // Check if membership already exists
    const existingMembership = await db
      .select()
      .from(membership)
      .where(and(
        eq(membership.user_id, userId),
        eq(membership.school_id, schoolId)
      ))
      .limit(1);

    if (existingMembership.length === 0) {
      // Create membership with student role
      await db.insert(membership).values({
        user_id: userId,
        school_id: schoolId,
        role: "student",
        can_view_progress: false,
      });
    } else {
      // Update existing membership to student if it exists
      await db
        .update(membership)
        .set({
          role: "student",
          updated_at: new Date(),
        })
        .where(eq(membership.id, existingMembership[0].id));
    }

    return NextResponse.json(
      {
        success: true,
        request: {
          id: newRequest.id,
          schoolId: newRequest.school_id,
        },
        message: "Request automatically approved and user added to school",
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

