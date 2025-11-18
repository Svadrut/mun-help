// app/admin/progress/submission/[id]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { user, membership, lesson, submission, grade } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import React from "react";
import { remark } from "remark";
import html from "remark-html";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { renderNode } from "@/src/app/lessons/[...id]/lesson-viewer";
import { RenderToHtml } from "./render-to-html";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clerk = await currentUser();
  if (!clerk) redirect("/sign-in");

  const dbUserResult = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerk.id))
    .limit(1);
  if (dbUserResult.length === 0) redirect("/onboard");
  const dbUserData = dbUserResult[0];

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

  const submissionResult = await db
    .select()
    .from(submission)
    .where(eq(submission.id, Number(id)))
    .limit(1);
  if (submissionResult.length === 0) redirect("/admin/progress");
  const sub = submissionResult[0];

  const lessonResult = await db
    .select()
    .from(lesson)
    .where(eq(lesson.id, sub.lesson_id))
    .limit(1);
  if (lessonResult.length === 0) redirect("/admin/progress");
  const les = lessonResult[0];

  const studentResult = await db
    .select()
    .from(user)
    .where(eq(user.id, sub.user_id))
    .limit(1);
  const student = studentResult.length ? studentResult[0] : null;

  const gradeResult = await db
    .select()
    .from(grade)
    .where(eq(grade.submission_id, sub.id))
    .limit(1);
  const gradeScore = gradeResult.length ? gradeResult[0].score : null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Submission Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>Student:</strong> {student?.display_name}
          </p>
          <p>
            <strong>Lesson:</strong> {les.title}
          </p>
          <p>
            <strong>Type:</strong>{" "}
            {les.type[0].toUpperCase() + les.type.slice(1)}
          </p>
          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(sub.submitted_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            <strong>Grade:</strong> {gradeScore ?? "—"}
          </p>
        </CardContent>
      </Card>

      {(les.type === "writing" || les.type === "both") && (
        <Card>
          <CardHeader>
            <CardTitle>Written Submission</CardTitle>
          </CardHeader>
          <CardContent>
            {sub.content_markdown ? (
              <RenderToHtml
                content={JSON.parse(submissionResult[0].content_markdown!)}
              />
            ) : (
              <p>No written content submitted.</p>
            )}
          </CardContent>
        </Card>
      )}

      {(les.type === "speaking" || les.type === "both") && (
        <Card>
          <CardHeader>
            <CardTitle>Speaking Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sub.media_url ? (
              <audio
                controls
                src={sub.media_url}
                className="w-full rounded-md border"
              >
                Your browser does not support the audio element.
              </audio>
            ) : (
              <p>No recording uploaded.</p>
            )}

            {sub.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap">
                  {sub.transcript}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {gradeResult[0].ai_comments ? (
            gradeResult[0].ai_comments
          ) : (
            <p>No AI feedback available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
