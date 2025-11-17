"use client";

import { Button } from "@/components/ui/button";
import ActivityEditor from "@/src/components/activity-editor";
import AudioRecorderCard from "@/src/components/AudioRecorderCard";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import React, { useState, JSX, useEffect } from "react";
import { toast } from "sonner";

function saveActivity(content: NodeJSON | null, id: string) {
  const prevSaves =
    localStorage.getItem("activity") !== null
      ? (JSON.parse(localStorage.getItem("activity")!) as {
          content: NodeJSON | null;
          id: string;
        }[])
      : ([] as {
          content: NodeJSON | null;
          id: string;
        }[]);

  const alreadySaved = prevSaves.findIndex((val) => val.id === id);

  if (alreadySaved !== -1) {
    prevSaves[alreadySaved] = {
      id,
      content,
    };
  } else {
    prevSaves.push({
      content,
      id,
    });
  }

  localStorage.setItem("activity", JSON.stringify(prevSaves));
  toast("Saved!");
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
}: {
  doc: NodeJSON;
  id: string;
  type: "writing" | "speaking" | "both";
  title: string;
}) => {
  const [content, setContent] = useState<NodeJSON | null>(null);
  const [contentLoading, setContentLoading] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const activity =
      localStorage.getItem("activity") !== null
        ? (
            JSON.parse(localStorage.getItem("activity")!) as {
              content: NodeJSON | null;
              id: string;
            }[]
          ).filter((i) => {
            console.log(id, "ASDFASDFASDF" + i.id);
            return i.id === id;
          })
        : null;
    console.log(activity);
    if (activity && activity[0] !== undefined) {
      setContent(activity[0].content);
      console.log(activity[0].content);
      setContentLoading("asdfkasd");
      console.log("running");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitEvent = e.nativeEvent as SubmitEvent;
    const submitter = submitEvent?.submitter as HTMLButtonElement | undefined;
    if (submitter && submitter.name != "submit-button") {
      return;
    }
  }

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
            <AudioRecorderCard />
          </div>
        </div>
      )}
      <div className="flex flex-row gap-4 space-y-2 w-[60%] mx-auto">
        <Button type="submit" disabled={isSubmitting} name="submit-button">
          {isSubmitting ? "Creating..." : "Submit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            saveActivity(content, id);
          }}
          disabled={isSubmitting}
        >
          Save
        </Button>
      </div>
    </form>
  );
};
