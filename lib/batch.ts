import { unzipSync } from "fflate";
import type { Grade, Rubric } from "./schemas";

export type Row = {
  id: string;
  fileName: string;
  status: "queued" | "grading" | "done" | "error";
  error?: string;
  grade?: Grade;
  edited?: string[]; // "name" or criterion ids the teacher changed by hand
};

// Returns the PDFs inside a zip, skipping folders, macOS metadata and other file types.
export function pdfsFromZip(zip: Uint8Array) {
  const entries = unzipSync(zip, {
    filter: (f) => /\.pdf$/i.test(f.name) && !f.name.startsWith("__MACOSX/") && !/(^|\/)\._/.test(f.name),
  });
  return Object.entries(entries).map(([path, bytes]) => ({
    name: path.split("/").pop()!,
    bytes,
  }));
}

export const total = (g: Grade) => g.scores.reduce((sum, s) => sum + s.points, 0);
export const maxTotal = (r: Rubric) => r.criteria.reduce((sum, c) => sum + c.maxPoints, 0);

export function flagsFor(row: Row, rows: Row[]) {
  const g = row.grade;
  if (!g) return [];
  const flags: string[] = [];
  const nameEdited = row.edited?.includes("name");
  if (!g.studentName) flags.push("No name found");
  else if (!nameEdited) {
    if (g.nameSource === "filename") flags.push("Name only from filename");
    else if (g.nameConfidence === "low") flags.push("Unsure about name");
  }
  const key = g.studentName?.trim().toLowerCase();
  if (key && rows.some((r) => r !== row && r.grade?.studentName?.trim().toLowerCase() === key)) {
    flags.push("Duplicate name");
  }
  return [...flags, ...g.issues];
}

export function toCsv(rows: Row[], rubric: Rubric) {
  const max = maxTotal(rubric);
  const header = [
    "File",
    "Student",
    "Name source",
    ...rubric.criteria.map((c) => `${c.name} (/${c.maxPoints})`),
    `Total (/${max})`,
    "Percent",
    "Flags",
    "Edited by hand",
    "Feedback",
  ];
  const lines = rows
    .filter((r) => r.grade)
    .map((r) => {
      const g = r.grade!;
      const t = total(g);
      return [
        r.fileName,
        g.studentName ?? "",
        g.nameSource,
        ...rubric.criteria.map((c) => g.scores.find((s) => s.criterionId === c.id)?.points ?? ""),
        t,
        ((t / max) * 100).toFixed(1),
        flagsFor(r, rows).join("; "),
        (r.edited ?? []).join("; "),
        g.overallFeedback,
      ];
    });
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel reads accented names as UTF-8.
  return "﻿" + [header, ...lines].map((l) => l.map(escape).join(",")).join("\r\n");
}
