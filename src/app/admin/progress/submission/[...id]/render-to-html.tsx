"use client";

import { renderNode } from "@/src/app/lessons/[...id]/lesson-viewer";
import { NodeJSON } from "prosekit/core";

export const RenderToHtml = ({ content }: { content: NodeJSON }) => {
  return renderNode(content);
};
