import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { joinRequest, user, membership, lesson } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";
import RequestsTable from "./lessons-table";

export default async function RequestsPage() {
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
    .where(
      and(
        eq(membership.user_id, dbUser.id),
        eq(membership.school_id, dbUser.school_id),
        eq(membership.role, "admin")
      )
    )
    .limit(1);

  if (userMembership.length > 0) {
    redirect("/admin/lessons");
  }

  // Get all pending requests for this school
  const lessons = await db
    .select()
    .from(lesson)
    .where(eq(lesson.school_id, dbUser.school_id))
    .orderBy(desc(lesson.created_at));

  // Format dates on the server to avoid hydration mismatch
  // Use UTC timezone to ensure consistent formatting between server and client
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const formattedLessons = lessons.map((lesson) => {
    const date = new Date(lesson.created_at);
    // Format using UTC to avoid timezone differences
    const year = date.getUTCFullYear();
    const month = monthNames[date.getUTCMonth()];
    const day = date.getUTCDate();
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const formattedDate = `${month} ${day}, ${year}, ${hours}:${minutes}`;
    return {
      ...lesson,
      created_at: formattedDate,
    };
  });

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lessons</h1>
        </div>

        <RequestsTable lessons={formattedLessons} />
      </div>
    </div>
  );
}
