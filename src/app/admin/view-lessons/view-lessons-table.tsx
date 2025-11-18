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

export default function ViewLessonsTable({
  lessons,
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
            </TableRow>
          </TableHeader>

          <TableBody>
            {lessons.map((lesson) => {
              return (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">{lesson.title}</TableCell>

                  <TableCell>
                    {lesson.type[0].toUpperCase() + lesson.type.substring(1)}
                  </TableCell>

                  <TableCell>{lesson.created_at}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
