"use client";

import { Button } from "@/components/ui/button";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Lessons({
  lessons,
  submissions
}: {
  lessons: {
    created_at: string;
    id: number;
    school_id: number;
    created_by: number;
    title: string;
    headings: string[] | null;
    content_markdown: string;
    reference_video_url: string | null;
    grading_guide: string | null;
    type: "writing" | "speaking" | "both";
    is_published: boolean;
    updated_at: Date;
  }[];
  submissions: {
    id: number;
    lesson_id: number;
    user_id: number;
    content_markdown: string | null;
    media_url: string | null;
    transcript: string | null;
    raw_metrics: Record<string, any> | null;
    status: "draft" | "submitted" | "graded" | "resubmitted";
    submitted_at: Date;
    updated_at: Date;
  }[];
}) {
  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {lessons.map((lesson) => {
              const submission = submissions.find((sub) => sub.lesson_id === lesson.id);
              
              return (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">{lesson.title}</TableCell>

                  <TableCell>
                    {lesson.type[0].toUpperCase() + lesson.type.substring(1)}
                  </TableCell>

                  <TableCell>{lesson.created_at}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* {submission && (
                        <Link href={`/lessons/submission/${lesson.id}`}>
                          <Button size="sm" variant="outline">
                            Check Grade
                          </Button>
                        </Link>
                      )} */}
                      <Link href={`/lessons/${lesson.id}`}>
                        <Button size="sm">
                          View <ArrowRight />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
