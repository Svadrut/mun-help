"use client";

import React from "react";

export interface GradeProps {
  grade: {
    gradeId: number;
    score: number;
    aiComments: string;
    teacherComments: string;
    studentId: number;
    lessonId: number;
  };
//   submission: {
//     content: string | null;
//     media: string | null;
//     transcript: string | null;
//   };
  lessonTitle: string;
}

const GradeViewer = ({ grade, lessonTitle }: GradeProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <h1 className="text-3xl font-bold mb-6">{lessonTitle}</h1>

      <div className="w-full max-w-3xl border-2 rounded-2xl p-4 shadow">
        {/* <h2 className="text-xl font-semibold mb-2">Submission</h2> */}

        <h1 className="text-2xl font-semibold mb-6">Grade: {grade.score ?? "N/A"}/100</h1>

        <h3 className="font-semibold mt-4 mb-1">AI Feedback</h3>
        <div className="p-2 rounded whitespace-pre-wrap mb-4">
          {grade.aiComments || "No AI feedback."}
        </div>
      </div>
    </div>
  );
};

export default GradeViewer;
