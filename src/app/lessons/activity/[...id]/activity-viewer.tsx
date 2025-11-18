"use client";

import { Button } from "@/components/ui/button";
import ActivityEditor from "@/src/components/activity-editor";
import AudioRecorderCard from "@/src/components/AudioRecorderCard";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import React, { useState, JSX, useEffect } from "react";
import { toast } from "sonner";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

type NodeJSON = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: NodeJSON[];
};

// Render text marks like bold/italic/strike/code
const renderMarks = (
  text: React.ReactNode,
  marks?: NodeJSON["marks"]
): React.ReactNode => {
  if (!marks) return text;

  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "strike":
      case "strikethrough":
        return <del>{acc}</del>;
      case "code":
        return <code>{acc}</code>;
      default:
        return acc;
    }
  }, text);
};

// Recursive node renderer
const renderNode = (node: NodeJSON, key?: number | string): React.ReactNode => {
  if (node.type === "text") return renderMarks(node.text, node.marks);

  const children = node.content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    case "paragraph":
      // If text is <!-- Slide -->, render a marker
      const paragraphText =
        node.content?.map((c) => (c.type === "text" ? c.text : "")).join("") ||
        "";
      return (
        <p key={key} className="mb-4">
          {children}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level ?? 1;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const classMap = {
        1: "font-bold text-4xl leading-[2.5rem] mt-0 mb-2",
        2: "font-bold text-3xl leading-[2.25rem] mt-8 mb-2",
        3: "font-bold text-2xl leading-8 mt-8 mb-2",
        4: "font-bold text-xl leading-6 mt-6 mb-2",
        5: "font-bold text-lg leading-6 mt-6 mb-2",
        6: "font-bold text-base leading-5 mt-6 mb-2",
      };

      return (
        //@ts-ignore
        <Tag key={key} className={classMap[level] || classMap[6]}>
          {children}
        </Tag>
      );
    }

    case "list": {
      const kind = node.attrs?.kind;
      const isOrdered = kind === "ordered";
      const Wrapper = isOrdered ? "ol" : "ul";
      const wrapperClass = isOrdered
        ? "list-decimal pl-6 mt-2 mb-2"
        : "list-disc pl-6 mt-2 mb-2";

      return React.createElement(
        Wrapper,
        { key, className: wrapperClass },
        node.content?.map((child, i) => {
          if (child.type === "paragraph") {
            return (
              <li key={i} className="my-1">
                {child.content?.map((c, j) => renderNode(c, j))}
              </li>
            );
          }
          return (
            <li key={i} className="my-1">
              {renderNode(child)}
            </li>
          );
        })
      );
    }

    case "codeBlock":
      return (
        <pre
          key={key}
          className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md overflow-x-auto"
        >
          <code>{children}</code>
        </pre>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-gray-400 pl-4 italic my-2"
        >
          {children}
        </blockquote>
      );

    case "horizontalRule":
      return <hr key={key} className="border-t border-gray-300 my-4" />;

    case "hardBreak":
      return <br key={key} />;

    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
};

export const ActivityViewer = ({
  doc,
  id,
  type,
  title,
  userId,
  schoolId,
}: {
  doc: NodeJSON;
  id: string;
  type: "writing" | "speaking" | "both";
  title: string;
  userId: number;
  schoolId: number;
}) => {
  const [content, setContent] = useState<NodeJSON | null>(null);
  const [contentLoading, setContentLoading] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null); // <--- new state

  async function saveActivity() {
    const prevSaves =
      localStorage.getItem("activity") !== null
        ? (JSON.parse(localStorage.getItem("activity")!) as {
            content: NodeJSON | null;
            id: string;
            audioBase64?: string;
          }[])
        : [];

    const alreadySaved = prevSaves.findIndex((val) => val.id === id);

    let audioBase64: string | undefined;
    if (audioBlob) {
      audioBase64 = await blobToDataURL(audioBlob);
    }

    const newEntry = {
      id,
      content: type === "writing" || type === "both" ? content : null,
      audioBase64: audioBase64 ?? prevSaves[alreadySaved]?.audioBase64,
    };

    if (alreadySaved !== -1) {
      prevSaves[alreadySaved] = newEntry;
    } else {
      prevSaves.push(newEntry);
    }

    localStorage.setItem("activity", JSON.stringify(prevSaves));
    toast("Saved!");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const submitEvent = e.nativeEvent as SubmitEvent;
    const submitter = submitEvent?.submitter as HTMLButtonElement | undefined;
    if (submitter && submitter.name != "submit-button") return;

    setIsSubmitting(true);

    let audioUrl = null;

    if (audioBlob) {
      const base64 = await blobToDataURL(audioBlob);

      const res = await fetch("/api/upload-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          filename: `recording-${id}.webm`,
        }),
      });

      const data = await res.json();
      audioUrl = data?.uploaded?.[0]?.data?.url ?? null;
      console.log("BBBBBBBBBBBBBBBBBBBB" + audioUrl)
    }

    const res2 = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioUrl: audioUrl,
        type,
        id,
        userId,
        schoolId,
        content: content,
      }),
    });

    setIsSubmitting(false);
    redirect("/lessons")
  }

  useEffect(() => {
    const saved = localStorage.getItem("activity");
    if (!saved) return;

    const activity = JSON.parse(saved).find((a: any) => a.id === id);
    if (!activity) return;

    if (activity.content) {
      setContent(activity.content);
      setContentLoading("Asdf");
    }

    if (activity.audioBase64) {
      // convert base64 back to blob
      const byteString = atob(activity.audioBase64.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "audio/webm" });
      setAudioBlob(blob);
    }
  }, [id]);

  return (
    <form
      className="flex flex-col items-center justify-center space-y-14"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col space-y-2 w-full max-w-[60%] mx-auto">
        <div className="h-16" />
        <h1 className="text-3xl font-bold mb-8">{title}</h1>

        <label className="font-bold text-sm">Instructions</label>

        <div className="min-h-24 border-input border-2 rounded-2xl p-3 flex flex-col">
          <div className="lesson-card max-w-none flex-1">{renderNode(doc)}</div>
        </div>
      </div>
      {(type === "both" || type === "writing") && (
        <div className="flex flex-col space-y-2 w-[60%] mx-auto">
          <label className="font-bold text-sm">
            Writing activity <span className="text-destructive">*</span>
          </label>
          <ActivityEditor
            content={content}
            onChange={(json) => setContent(json)}
            key={contentLoading}
          />
        </div>
      )}
      {(type === "both" || type === "speaking") && (
        <div className="flex flex-col space-y-2 w-[60%] mx-auto">
          <label className="font-bold text-sm">
            Speaking activity <span className="text-destructive">*</span>
          </label>
          <div className="w-full items-start">
            <AudioRecorderCard
              onRecordingComplete={(blob) => setAudioBlob(blob)}
              initialAudio={audioBlob}
            />
          </div>
        </div>
      )}
      <div className="flex flex-row gap-4 space-y-2 w-[60%] mx-auto mb-5">
        <Button type="submit" disabled={isSubmitting} name="submit-button">
          {isSubmitting ? "Creating..." : "Submit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            saveActivity();
          }}
          disabled={isSubmitting}
        >
          Save
        </Button>
      </div>
    </form>
  );
};
