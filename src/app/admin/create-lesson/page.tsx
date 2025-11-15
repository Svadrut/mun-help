import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { user, membership } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import CreateLessonForm from "./create-lesson-form";

export default async function CreateLessonPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Get the current user from the database
  const currentDbUser = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerkUser.id))
    .limit(1);

  if (currentDbUser.length === 0) {
    redirect("/onboard");
  }

  const dbUser = currentDbUser[0];

  // Check if user is an admin
  const userMembership = await db
    .select()
    .from(membership)
    .where(and(
      eq(membership.user_id, dbUser.id),
      eq(membership.school_id, dbUser.school_id),
      eq(membership.role, "admin")
    ))
    .limit(1);

  if (userMembership.length === 0) {
    redirect("/lessons");
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create a New Lesson</h1>
          <p className="text-muted-foreground">
            E.g. Intro to Crisis
          </p>
        </div>
        
        <CreateLessonForm schoolId={dbUser.school_id} userId={dbUser.id} />
      </div>
    </div>
  );
}

