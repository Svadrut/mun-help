"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postForm } from "@/lib/api";
import { maxTotal } from "@/lib/batch";
import type { Rubric } from "@/lib/schemas";

const input =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70";

type Props = {
  rubric: Rubric | null;
  onChange: (rubric: Rubric | null) => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  locked: boolean;
};

export function RubricEditor({ rubric, onChange, instructions, onInstructionsChange, locked }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);

  async function readRubric() {
    const form = new FormData();
    form.set("text", text);
    if (file) form.set("file", file);
    setReading(true);
    try {
      onChange(await postForm<Rubric>("/api/rubric", form));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the rubric");
    } finally {
      setReading(false);
    }
  }

  if (!rubric) {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          id="rubric-text"
          className={`${input} min-h-40 font-mono text-xs`}
          placeholder={"Paste your rubric here.\n\nResearch (10): cites at least three sources...\nPolicy (10): ..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">
            or upload a PDF{" "}
            <input
              id="rubric-file"
              type="file"
              accept="application/pdf"
              className="text-sm file:mr-2 file:rounded-md file:border file:border-input file:bg-transparent file:px-2 file:py-1"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                onChange({ title: "Assignment", criteria: [{ id: "c1", name: "", maxPoints: 10, description: "" }] })
              }
            >
              Enter by hand
            </Button>
            <Button onClick={readRubric} disabled={reading || (!text.trim() && !file)}>
              {reading && <Loader2Icon className="animate-spin" />}
              {reading ? "Reading rubric" : "Read rubric"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const setCriterion = (i: number, patch: Partial<Rubric["criteria"][number]>) =>
    onChange({ ...rubric, criteria: rubric.criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Assignment</span>
          <input
            id="rubric-title"
            className={input}
            value={rubric.title}
            disabled={locked}
            onChange={(e) => onChange({ ...rubric, title: e.target.value })}
          />
        </label>
        <div className="text-sm text-muted-foreground tabular-nums">Out of {maxTotal(rubric)}</div>
        {!locked && (
          <Button variant="outline" onClick={() => onChange(null)}>
            Start over
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {rubric.criteria.map((c, i) => (
          <div key={c.id} className="grid grid-cols-[1fr_5rem_auto] gap-2 sm:grid-cols-[14rem_5rem_1fr_auto]">
            <input
              id={`criterion-name-${c.id}`}
              className={input}
              placeholder="Criterion"
              value={c.name}
              disabled={locked}
              onChange={(e) => setCriterion(i, { name: e.target.value })}
            />
            <input
              id={`criterion-max-${c.id}`}
              className={`${input} tabular-nums`}
              type="number"
              min={1}
              aria-label="Max points"
              value={c.maxPoints}
              disabled={locked}
              onChange={(e) => setCriterion(i, { maxPoints: Math.max(1, Math.round(Number(e.target.value))) })}
            />
            <textarea
              id={`criterion-desc-${c.id}`}
              className={`${input} col-span-3 row-start-2 min-h-9 sm:col-span-1 sm:row-start-auto`}
              rows={1}
              placeholder="What earns full marks"
              value={c.description}
              disabled={locked}
              onChange={(e) => setCriterion(i, { description: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove criterion"
              disabled={locked || rubric.criteria.length === 1}
              onClick={() => onChange({ ...rubric, criteria: rubric.criteria.filter((_, j) => j !== i) })}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
        {!locked && (
          <Button
            variant="ghost"
            className="self-start"
            onClick={() =>
              onChange({
                ...rubric,
                criteria: [...rubric.criteria, { id: `c${Date.now()}`, name: "", maxPoints: 10, description: "" }],
              })
            }
          >
            <PlusIcon /> Add criterion
          </Button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Extra instructions for the grader (optional)</span>
        <textarea
          id="grader-instructions"
          className={`${input} min-h-16`}
          placeholder="This is a first draft, so go easy on formatting."
          value={instructions}
          disabled={locked}
          onChange={(e) => onInstructionsChange(e.target.value)}
        />
      </label>
      {locked && (
        <p className="text-sm text-muted-foreground">
          The rubric is locked while a batch is loaded. Start a new batch to change it.
        </p>
      )}
    </div>
  );
}
