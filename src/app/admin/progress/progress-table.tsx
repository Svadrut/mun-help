"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProgressTable({
  submissions,
}: {
  submissions: {
    submissionId: number;
    lessonId: number;
    lessonTitle: string;
    lessonType: "writing" | "speaking" | "both";
    submittedAt: Date;
    studentName: string | null;
    studentId: number;
    grade: number | null;
  }[];
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Lesson</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className="text-right">View</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {submissions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No submissions yet.
              </TableCell>
            </TableRow>
          )}

          {submissions.map((s) => (
            <TableRow key={s.submissionId}>
              <TableCell>{s.studentName}</TableCell>
              <TableCell>{s.lessonTitle}</TableCell>
              <TableCell>
                {s.lessonType[0].toUpperCase() + s.lessonType.slice(1)}
              </TableCell>
              <TableCell>
                {new Date(s.submittedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>{s.grade ?? "—"}</TableCell>

              <TableCell className="text-right">
                <Link href={`/admin/progress/submission/${s.submissionId}`}>
                  <Button size="sm" variant="outline">
                    View Submission
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
