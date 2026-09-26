"use client";

import { useCallback, useEffect, useState } from "react";
import { delMany, get, set, setMany } from "idb-keyval";
import { DownloadIcon, RotateCwIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { postForm } from "@/lib/api";
import { flagsFor, pdfsFromZip, toCsv, type Row } from "@/lib/batch";
import type { Grade, Rubric } from "@/lib/schemas";
import { RubricEditor } from "./rubric-editor";
import { ResultsTable } from "./results-table";

const CONCURRENCY = 4;
const STATE_KEY = "grader-state";
const pdfKey = (id: string) => `pdf:${id}`;

type Saved = { rubric: Rubric | null; instructions: string; rows: Row[] };

export function Grader() {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [instructions, setInstructions] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  // Restore the last batch. Anything that was mid-request when the tab closed goes back in the queue.
  useEffect(() => {
    get<Saved>(STATE_KEY)
      .then((saved) => {
        if (!saved) return;
        setRubric(saved.rubric);
        setInstructions(saved.instructions);
        setRows(saved.rows.map((r) => (r.status === "grading" ? { ...r, status: "queued" } : r)));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) set(STATE_KEY, { rubric, instructions, rows } satisfies Saved).catch(() => {});
  }, [loaded, rubric, instructions, rows]);

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const gradeRow = useCallback(
    async (row: Row, rubric: Rubric) => {
      updateRow(row.id, { status: "grading", error: undefined });
      try {
        const bytes = await get<Uint8Array>(pdfKey(row.id));
        if (!bytes) throw new Error("The PDF is no longer stored in this browser. Upload the zip again.");
        const form = new FormData();
        form.set("file", new File([bytes as BlobPart], row.fileName, { type: "application/pdf" }));
        form.set("rubric", JSON.stringify(rubric));
        form.set("instructions", instructions);
        const grade = await postForm<Grade>("/api/grade", form);
        updateRow(row.id, { status: "done", grade, edited: [] });
      } catch (e) {
        updateRow(row.id, { status: "error", error: e instanceof Error ? e.message : "Grading failed" });
      }
    },
    [instructions]
  );

  // Keep up to CONCURRENCY requests in flight.
  useEffect(() => {
    if (!loaded || !rubric) return;
    const slots = CONCURRENCY - rows.filter((r) => r.status === "grading").length;
    rows
      .filter((r) => r.status === "queued")
      .slice(0, Math.max(0, slots))
      .forEach((r) => gradeRow(r, rubric));
  }, [loaded, rubric, rows, gradeRow]);

  async function addFiles(files: File[]) {
    try {
      const pdfs = (
        await Promise.all(
          files.map(async (f) => {
            const bytes = new Uint8Array(await f.arrayBuffer());
            if (/\.zip$/i.test(f.name)) return pdfsFromZip(bytes);
            return /\.pdf$/i.test(f.name) ? [{ name: f.name, bytes }] : [];
          })
        )
      ).flat();
      if (!pdfs.length) return toast.error("No PDFs found. Upload PDFs or a .zip of PDFs.");
      const newRows: Row[] = pdfs
        .sort((a, b) => a.name.localeCompare(b.name))
        // Not crypto.randomUUID: it's missing on plain-http LAN addresses.
        .map((p) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, fileName: p.name, status: "queued" }));
      await setMany(newRows.map((r, i) => [pdfKey(r.id), pdfs[i].bytes]));
      setRows((rows) => [...rows, ...newRows]);
      toast.success(`Grading ${pdfs.length} PDFs`);
    } catch {
      toast.error("Couldn't open that zip file");
    }
  }

  async function newBatch() {
    await delMany(rows.map((r) => pdfKey(r.id))).catch(() => {});
    setRows([]);
  }

  function downloadCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(rows, rubric!)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades-${rubric!.title.replace(/[^\w-]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = rows.filter((r) => r.status === "done").length;
  const failed = rows.filter((r) => r.status === "error").length;
  const flagged = rows.filter((r) => flagsFor(r, rows).length > 0).length;
  const rubricReady = !!rubric && rubric.criteria.every((c) => c.name.trim());
  const shown = flaggedOnly ? rows.filter((r) => r.status === "error" || flagsFor(r, rows).length) : rows;

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Rubric</CardTitle>
          <CardDescription>
            Paste it or upload it. Check the criteria and points before grading, since each one becomes a CSV column.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RubricEditor
            rubric={rubric}
            onChange={setRubric}
            instructions={instructions}
            onInstructionsChange={setInstructions}
            locked={rows.length > 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Submissions</CardTitle>
          <CardDescription>
            Student PDFs, or a zip of them. Folders inside the zip are fine, and anything that isn&apos;t a PDF
            is skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileDrop disabled={!rubricReady} onFiles={addFiles} />
        </CardContent>
      </Card>

      {rows.length > 0 && rubric && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>3. Grades</CardTitle>
              <CardDescription className="tabular-nums">
                {done} of {rows.length} graded · {flagged} to check · {failed} failed
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  id="flagged-only"
                  type="checkbox"
                  checked={flaggedOnly}
                  onChange={(e) => setFlaggedOnly(e.target.checked)}
                />
                Only show rows to check
              </label>
              {failed > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setRows((rows) => rows.map((r) => (r.status === "error" ? { ...r, status: "queued" } : r)))}
                >
                  <RotateCwIcon /> Retry failed
                </Button>
              )}
              <Button variant="outline" onClick={newBatch}>
                New batch
              </Button>
              <Button onClick={downloadCsv} disabled={done === 0}>
                <DownloadIcon /> Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResultsTable
              rows={shown}
              rubric={rubric}
              onEdit={(id, field, update) =>
                setRows((rows) =>
                  rows.map((r) =>
                    r.id === id && r.grade
                      ? { ...r, grade: update(r.grade), edited: [...new Set([...(r.edited ?? []), field])] }
                      : r
                  )
                )
              }
              onRegrade={(id) => updateRow(id, { status: "queued" })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FileDrop({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors ${
        over ? "border-primary bg-primary/5" : "border-input"
      } ${disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer hover:bg-accent/50"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles([...e.dataTransfer.files]);
      }}
    >
      <UploadIcon className="size-8 text-muted-foreground" />
      <span className="font-medium">Drop PDFs or a .zip here, or click to choose</span>
      {disabled && <span>Add a rubric in step 1 first.</span>}
      <input
        id="submission-files"
        type="file"
        multiple
        accept=".pdf,application/pdf,.zip,application/zip"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
