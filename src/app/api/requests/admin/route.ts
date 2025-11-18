import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { joinRequest, user, membership } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentDbUser = await db
      .select()
      .from(user)
      .where(eq(user.clerk_id, clerkUser.id))
      .limit(1);

    if (currentDbUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userMembership = await db
      .select()
      .from(membership)
      .where(
        and(
          eq(membership.user_id, currentDbUser[0].id),
          eq(membership.school_id, currentDbUser[0].school_id),
          eq(membership.role, "admin")
        )
      )
      .limit(1);

    if (userMembership.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId || typeof requestId !== "number") {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    const [joinReq] = await db
      .select()
      .from(joinRequest)
      .where(eq(joinRequest.id, requestId))
      .limit(1);

    if (!joinReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (joinReq.school_id !== currentDbUser[0].school_id) {
      return NextResponse.json(
        { error: "Unauthorized - Request does not belong to your school" },
        { status: 403 }
      );
    }

    if (joinReq.status !== "pending") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.clerk_id, joinReq.clerk_id))
      .limit(1);

    let userId: number;

    if (existingUser.length > 0) {
      const [updatedUser] = await db
        .update(user)
        .set({
          school_id: joinReq.school_id,
          email: joinReq.email,
          display_name: joinReq.name,
          updated_at: new Date(),
        })
        .where(eq(user.id, existingUser[0].id))
        .returning();

      userId = updatedUser.id;
    } else {
      const [newUser] = await db
        .insert(user)
        .values({
          clerk_id: joinReq.clerk_id,
          school_id: joinReq.school_id,
          email: joinReq.email,
          display_name: joinReq.name,
        })
        .returning();

      userId = newUser.id;
    }

    const existingMembership = await db
      .select()
      .from(membership)
      .where(
        and(
          eq(membership.user_id, userId),
          eq(membership.school_id, joinReq.school_id)
        )
      )
      .limit(1);

    if (existingMembership.length === 0) {
      // MAKE THE USER AN ADMIN
      await db.insert(membership).values({
        user_id: userId,
        school_id: joinReq.school_id,
        role: "admin", // <-- changed role to admin
        can_view_progress: true, // optional, typically admin can view progress
      });
    } else {
      await db
        .update(membership)
        .set({
          role: "admin", // <-- changed role to admin
          updated_at: new Date(),
        })
        .where(eq(membership.id, existingMembership[0].id));
    }

    await db
      .update(joinRequest)
      .set({
        status: "approved",
        updated_at: new Date(),
      })
      .where(eq(joinRequest.id, requestId));

    const client = await clerkClient();
    await client.users.updateUser(clerkUser.id, {
      publicMetadata: {
        admin: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Request approved and user added as admin",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error approving request:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve request",
      },
      { status: 500 }
    );
  }
}
