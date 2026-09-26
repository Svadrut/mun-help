"use client";

import { Fragment, useState } from "react";
import { ChevronRightIcon, Loader2Icon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { flagsFor, maxTotal, total, type Row } from "@/lib/batch";
import type { Grade, Rubric } from "@/lib/schemas";

type Props = {
  rows: Row[];
  rubric: Rubric;
  onEdit: (id: string, field: string, update: (g: Grade) => Grade) => void;
  onRegrade: (id: string) => void;
};

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 outline-none hover:border-input focus-visible:border-ring";

export function ResultsTable({ rows, rubric, onEdit, onRegrade }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const max = maxTotal(rubric);
  const cols = rubric.criteria.length + 5;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>File</TableHead>
          <TableHead className="min-w-44">Student</TableHead>
          {rubric.criteria.map((c) => (
            <TableHead key={c.id} className="text-right" title={c.description}>
              {c.name} <span className="font-normal text-muted-foreground">/{c.maxPoints}</span>
            </TableHead>
          ))}
          <TableHead className="text-right">
            Total <span className="font-normal text-muted-foreground">/{max}</span>
          </TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const g = row.grade;
          const flags = flagsFor(row, rows);
          const isOpen = open === row.id;
          return (
            <Fragment key={row.id}>
              <TableRow className={cn(flags.length > 0 && "bg-amber-500/8")}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={isOpen ? "Hide details" : "Show details"}
                    disabled={!g && row.status !== "error"}
                    onClick={() => setOpen(isOpen ? null : row.id)}
                  >
                    <ChevronRightIcon className={cn("transition-transform", isOpen && "rotate-90")} />
                  </Button>
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground" title={row.fileName}>
                  {row.fileName}
                </TableCell>
                <TableCell>
                  {g && (
                    <input
                      id={`name-${row.id}`}
                      className={cellInput}
                      value={g.studentName ?? ""}
                      placeholder="Name not found"
                      onChange={(e) => onEdit(row.id, "name", (g) => ({ ...g, studentName: e.target.value || null }))}
                    />
                  )}
                </TableCell>
                {rubric.criteria.map((c) => {
                  const score = g?.scores.find((s) => s.criterionId === c.id);
                  return (
                    <TableCell key={c.id} className="w-20">
                      {score && (
                        <input
                          id={`score-${row.id}-${c.id}`}
                          type="number"
                          min={0}
                          max={c.maxPoints}
                          className={cn(cellInput, "text-right tabular-nums", row.edited?.includes(c.id) && "italic")}
                          value={score.points}
                          onChange={(e) => {
                            const points = Math.min(c.maxPoints, Math.max(0, Number(e.target.value)));
                            onEdit(row.id, c.id, (g) => ({
                              ...g,
                              scores: g.scores.map((s) => (s.criterionId === c.id ? { ...s, points } : s)),
                            }));
                          }}
                        />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-semibold tabular-nums">
                  {g && (
                    <>
                      {total(g)} <span className="font-normal text-muted-foreground">{Math.round((total(g) / max) * 100)}%</span>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <Status row={row} flags={flags} />
                </TableCell>
              </TableRow>
              {isOpen && (
                <TableRow className="hover:bg-transparent">
                  <TableCell />
                  <TableCell colSpan={cols} className="whitespace-normal">
                    <Details row={row} rubric={rubric} flags={flags} onRegrade={() => onRegrade(row.id)} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Status({ row, flags }: { row: Row; flags: string[] }) {
  const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  if (row.status === "queued") return <span className={cn(pill, "bg-muted text-muted-foreground")}>Queued</span>;
  if (row.status === "grading")
    return (
      <span className={cn(pill, "bg-primary/10 text-primary")}>
        <Loader2Icon className="size-3 animate-spin" /> Grading
      </span>
    );
  if (row.status === "error") return <span className={cn(pill, "bg-destructive/10 text-destructive")}>Failed</span>;
  if (flags.length)
    return (
      <span className={cn(pill, "bg-amber-500/15 text-amber-700 dark:text-amber-400")} title={flags.join("\n")}>
        Check: {flags[0]}
        {flags.length > 1 && ` +${flags.length - 1}`}
      </span>
    );
  return <span className={cn(pill, "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")}>OK</span>;
}

function Details({ row, rubric, flags, onRegrade }: { row: Row; rubric: Rubric; flags: string[]; onRegrade: () => void }) {
  const g = row.grade;
  return (
    <div className="flex max-w-3xl flex-col gap-3 py-2 text-sm">
      {row.error && <p className="text-destructive">{row.error}</p>}
      {flags.length > 0 && (
        <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400">
          {flags.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {g && (
        <>
          <p className="text-muted-foreground">
            Name found in: {g.nameSource.replace("_", " ")} ({g.nameConfidence} confidence)
          </p>
          <dl className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            {rubric.criteria.map((c) => {
              const s = g.scores.find((s) => s.criterionId === c.id);
              return (
                <Fragment key={c.id}>
                  <dt className="font-medium">
                    {c.name} <span className="tabular-nums text-muted-foreground">{s?.points}/{c.maxPoints}</span>
                  </dt>
                  <dd className="text-muted-foreground">{s?.justification}</dd>
                </Fragment>
              );
            })}
          </dl>
          <p>{g.overallFeedback}</p>
        </>
      )}
      <Button variant="outline" size="sm" className="self-start" disabled={row.status === "grading"} onClick={onRegrade}>
        <RotateCwIcon /> Re-grade this file
      </Button>
    </div>
  );
}
