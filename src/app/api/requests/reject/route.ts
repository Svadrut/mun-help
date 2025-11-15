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

    // Get the current admin user from the database
    const currentDbUser = await db
      .select()
      .from(user)
      .where(eq(user.clerk_id, clerkUser.id))
      .limit(1);

    if (currentDbUser.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is an admin
    const userMembership = await db
      .select()
      .from(membership)
      .where(and(
        eq(membership.user_id, currentDbUser[0].id),
        eq(membership.school_id, currentDbUser[0].school_id),
        eq(membership.role, "admin")
      ))
      .limit(1);

    if (userMembership.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { requestId } = body;

    if (!requestId || typeof requestId !== "number") {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Get the join request
    const [joinReq] = await db
      .select()
      .from(joinRequest)
      .where(eq(joinRequest.id, requestId))
      .limit(1);

    if (!joinReq) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Verify the request belongs to the admin's school
    if (joinReq.school_id !== currentDbUser[0].school_id) {
      return NextResponse.json(
        { error: "Unauthorized - Request does not belong to your school" },
        { status: 403 }
      );
    }

    // Check if request is already processed
    if (joinReq.status !== "pending") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // Update request status to rejected
    await db
      .update(joinRequest)
      .set({
        status: "rejected",
        updated_at: new Date(),
      })
      .where(eq(joinRequest.id, requestId));

    return NextResponse.json(
      {
        success: true,
        message: "Request rejected",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error rejecting request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to reject request",
      },
      { status: 500 }
    );
  }
}

