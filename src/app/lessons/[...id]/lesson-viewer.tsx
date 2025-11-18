"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import React, { useState, JSX } from "react";

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
export const renderNode = (node: NodeJSON, key?: number | string): React.ReactNode => {
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

// Utility: split doc content into slides
const splitSlides = (nodes: NodeJSON[]): NodeJSON[][] => {
  const slides: NodeJSON[][] = [[]];

  nodes.forEach((node) => {
    // Check if node is a paragraph containing <!-- Slide -->
    if (
      node.type === "paragraph" &&
      node.content?.some(
        (c) => c.type === "text" && c.text?.includes("<!-- Slide -->")
      )
    ) {
      slides.push([]); // start a new slide
    } else {
      // Append node to current slide
      slides[slides.length - 1].push(node);
    }
  });

  // Remove empty slides at the end
  return slides.filter((s) => s.length > 0);
};

export const LessonViewer = ({
  doc,
  id,
  title,
  alreadySubmitted,
}: {
  doc: NodeJSON;
  id: string;
  title: string;
  alreadySubmitted: boolean;
}) => {
  const slides = splitSlides(doc.content || []);
  const [currentSlide, setCurrentSlide] = useState(0);

  const goPrev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const goNext = () =>
    setCurrentSlide((s) => Math.min(slides.length - 1, s + 1));

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <div className="w-[600px] min-h-96 border-input border-2 rounded-2xl p-3 flex flex-col">
        <div className="lesson-card max-w-none flex-1">
          {slides.length > 0
            ? slides[currentSlide].map((n, i) => renderNode(n, i))
            : "No content"}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex justify-between mt-4 space-x-4">
          <Button onClick={goPrev} disabled={currentSlide === 0}>
            <ArrowLeft />
          </Button>
          <Button
            onClick={goNext}
            disabled={currentSlide === slides.length - 1}
          >
            <ArrowRight />
          </Button>
        </div>
      )}
      {currentSlide === slides.length - 1 && (
        <Link href={alreadySubmitted ? "#" : `/lessons/activity/${id}`}>
          <Button
            disabled={alreadySubmitted}
            className="mt-6"
            variant="outline"
          >
            {alreadySubmitted ? "Submission Completed" : "Continue to activity"}
            <ArrowRight />
          </Button>
        </Link>
      )}
    </div>
  );
};
