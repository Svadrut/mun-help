import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/db/drizzle";
import { school, user, membership } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get the current authenticated user from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 }
      );
    }

    // Create the school in the database
    const [newSchool] = await db
      .insert(school)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

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
          school_id: newSchool.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          display_name: clerkUser.firstName || clerkUser.username || null,
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
          school_id: newSchool.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          display_name: clerkUser.firstName || clerkUser.username || null,
        })
        .returning();

      userId = newUser.id;
    }

    // Check if membership already exists
    const existingMembership = await db
      .select()
      .from(membership)
      .where(
        and(
          eq(membership.user_id, userId),
          eq(membership.school_id, newSchool.id)
        )
      )
      .limit(1);

    if (existingMembership.length === 0) {
      // Create membership with admin role
      await db.insert(membership).values({
        user_id: userId,
        school_id: newSchool.id,
        role: "admin",
        can_view_progress: true,
      });
    } else {
      // Update existing membership to admin if it exists
      await db
        .update(membership)
        .set({
          role: "admin",
          can_view_progress: true,
          updated_at: new Date(),
        })
        .where(eq(membership.id, existingMembership[0].id));
    }

    const client = await clerkClient();
    await client.users.updateUser(clerkUser.id, {
      publicMetadata: {
        admin: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        school: {
          id: newSchool.id,
          name: newSchool.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create school",
      },
      { status: 500 }
    );
  }
}
