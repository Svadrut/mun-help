// app/admin/progress/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { user, membership, lesson, submission, grade } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";
import ProgressTable from "./progress-table";

export default async function ProgressPage() {
  const clerk = await currentUser();
  if (!clerk) redirect("/sign-in");

  // Get DB user
  const dbUserResult = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerk.id))
    .limit(1);

  if (dbUserResult.length === 0) redirect("/onboard");
  const dbUserData = dbUserResult[0];

  // Require admin role
  const membershipResult = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.user_id, dbUserData.id),
        eq(membership.school_id, dbUserData.school_id),
        eq(membership.role, "admin")
      )
    )
    .limit(1);

  if (membershipResult.length === 0) redirect("/lessons");

  // Fetch all submissions for this school
  const rows = await db
    .select({
      submissionId: submission.id,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonType: lesson.type,
      submittedAt: submission.submitted_at,
      studentName: user.display_name,
      studentId: user.id,
    })
    .from(submission)
    .innerJoin(lesson, eq(submission.lesson_id, lesson.id))
    .innerJoin(user, eq(submission.user_id, user.id))
    .where(eq(lesson.school_id, dbUserData.school_id))
    .orderBy(desc(submission.submitted_at));

  const grades = await db.select().from(grade);

  const newRows = rows.map((row) => ({
    submissionId: row.submissionId,
    lessonId: row.lessonId,
    lessonTitle: row.lessonTitle,
    lessonType: row.lessonType,
    submittedAt: row.submittedAt,
    studentName: row.studentName,
    studentId: row.studentId,
    grade:
      grades.find((grade) => grade.submission_id === row.submissionId)?.score ??
      null,
  })) as {
    submissionId: number;
    lessonId: number;
    lessonTitle: string;
    lessonType: "writing" | "speaking" | "both";
    submittedAt: Date;
    studentName: string | null;
    studentId: number;
    grade: number | null;
  }[];

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Student Progress</h1>
      <ProgressTable submissions={newRows} />
    </div>
  );
}
