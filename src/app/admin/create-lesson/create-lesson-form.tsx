"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import LessonEditor from "@/src/components/lesson-editor";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import type { Editor, NodeJSON } from "prosekit/core";
import { defineBasicExtension } from "prosekit/basic";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import SchoolSelector from "../../onboard/school-selector";
import { CreateLessonDropdown } from "./create-lesson-dropdown";
import GuideLineEditor from "@/src/components/guideline-editor";
import InstructionsEditor from "@/src/components/instructions-editor";

interface CreateLessonFormProps {
  schoolId: number;
  userId: number;
}



function saveLesson(
  title: string,
  content: NodeJSON | null,
  guidelineContent: NodeJSON | null,
  activityType: string,
  instructions: NodeJSON | null,
) {
  if (title.length === 0) {
    return;
  }
  const prevSaves =
    localStorage.getItem("create-lesson") !== null
      ? (JSON.parse(localStorage.getItem("create-lesson")!) as {
          title: string;
          content: NodeJSON | null;
          guidelineContent: NodeJSON | null;
          instructions: NodeJSON | null;
          activityType: string;
        }[])
      : ([] as {
          title: string;
          content: NodeJSON | null;
          guidelineContent: NodeJSON | null;
          instructions: NodeJSON | null;
          activityType: string;
        }[]);

  const alreadySaved = prevSaves.findIndex((val) => val.title === title);

  if (alreadySaved !== -1) {
    prevSaves[alreadySaved] = {
      title,
      content,
      guidelineContent,
      activityType,
      instructions,
    };
  } else {
    prevSaves.push({ title, content, guidelineContent, activityType, instructions });
  }

  localStorage.setItem("create-lesson", JSON.stringify(prevSaves));
  toast("Saved!");
}

export default function CreateLessonForm({
  schoolId,
  userId,
}: CreateLessonFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<NodeJSON | null>(null);
  const [guidelineContent, setGuidelineContent] = useState<NodeJSON | null>(
    null
  );
  const [activityType, setActivityType] = useState<
    "writing" | "speaking" | "both"
  >("writing");
  const [instructions, setInstructions] = useState<NodeJSON | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitEvent = e.nativeEvent as SubmitEvent;
    const submitter = submitEvent?.submitter as HTMLButtonElement | undefined;
    if (submitter && submitter.name != "submit-button") {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      setIsSubmitting(false);
      return;
    }

    if (!content || !guidelineContent || !instructions) {
      setError("Lesson content is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Convert ProseKit JSON to a simple markdown-like string
      // For now, we'll store the JSON and convert it when needed

      const response = await fetch("/api/admin/create-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          contentMarkdown: JSON.stringify(content), // Store as JSON string for now
          gradingGuide: JSON.stringify(guidelineContent),
          type: activityType,
          schoolId,
          userId,
          instructions: JSON.stringify(instructions),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create lesson");
      }

      const createLesson =
        localStorage.getItem("create-lesson") != null
          ? (JSON.parse(localStorage.getItem("create-lesson")!) as {
              title: string;
              content: NodeJSON | null;
              guidelineContent: NodeJSON | null;
              activityType: string;
              instructions: NodeJSON | null;
            }[])
          : null;

      createLesson !== null &&
        localStorage.setItem(
          "create-lesson",
          JSON.stringify(createLesson.filter((i) => i.title !== title))
        );

      // Redirect to lessons page on success
      router.push("/admin/view-lessons");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex space-y-2 flex-col">
        <label htmlFor="title" className="text-sm font-medium">
          Lesson Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter lesson title"
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">
          Activity Type <span className="text-destructive">*</span>
        </label>
        <CreateLessonDropdown
          activityType={activityType}
          setActivityType={setActivityType}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">
          Lesson Content <span className="text-destructive">*</span>
        </label>
        <LessonEditor
          content={content || undefined}
          onChange={(json) => setContent(json)}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">
          Activity Instructions <span className="text-destructive">*</span>
        </label>
        <InstructionsEditor
          content={instructions || undefined}
          onChange={(json) => setInstructions(json)}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">
          Grading Guidelines <span className="text-destructive">*</span>
        </label>
        <GuideLineEditor
          content={guidelineContent || undefined}
          onChange={(json) => setGuidelineContent(json)}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} name="submit-button">
          {isSubmitting ? "Creating..." : "Publish Lesson"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            saveLesson(title, content, guidelineContent, activityType, instructions);
          }}
          disabled={isSubmitting}
        >
          Save
        </Button>
      </div>
    </form>
  );
}
