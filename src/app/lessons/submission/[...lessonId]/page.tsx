import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { grade, user, membership, submission, lesson } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import GradeViewer from "./grade-viewer"; // client-side component

export default async function ViewGradeByLesson({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const currentDbUser = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerkUser.id))
    .limit(1);

  if (currentDbUser.length === 0) redirect("/onboard");
  const dbUser = currentDbUser[0];

  // Check membership (must be in the same school)
  const userMembership = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.user_id, dbUser.id),
        eq(membership.school_id, dbUser.school_id)
      )
    )
    .limit(1);

  if (userMembership.length === 0) redirect("/lessons");

  const { lessonId } = await params;
  const lessonIdInt = parseInt(lessonId);

  // Fetch the grade for this lesson
  const [gradeData] = await db
    .select()
    .from(grade)
    .where(and(eq(grade.lesson_id, lessonIdInt), eq(grade.user_id, dbUser.id)))
    .limit(1);

  if (!gradeData) redirect("/lessons");

  // Fetch the submission
  const [submissionData] = await db
    .select()
    .from(submission)
    .where(eq(submission.id, gradeData.submission_id));

  // Fetch lesson info
  const [lessonData] = await db
    .select({ title: lesson.title })
    .from(lesson)
    .where(eq(lesson.id, lessonIdInt));

  return (
    <GradeViewer
      grade={{
        gradeId: gradeData.id,
        score: gradeData.score ?? 0,
        aiComments: gradeData.ai_comments ?? "",
        teacherComments: gradeData.teacher_comments ?? "",
        studentId: gradeData.user_id,
        lessonId: gradeData.lesson_id,
      }}
    //   submission={{
    //     // content: submissionData.content_markdown,
    //     // media: submissionData.media_url,
    //     // transcript: submissionData.transcript,
    //   }}
      lessonTitle={lessonData?.title || ""}
    />
  );
}
