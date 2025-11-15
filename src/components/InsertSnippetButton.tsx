"use client";

import React from "react";
import { useEditor } from "prosekit/react";
import { Button } from "@/components/ui/button"; // shadcn Button

export function InsertSnippetButton({ snippet = "<!-- Slide -->" }: { snippet?: string }) {
  const editor = useEditor();

  if (!editor) return null;

  const handleClick = () => {
    const view = editor.view; // ProseMirror EditorView
    if (!view) return;

    const { state } = view;
    const { from, to } = state.selection;

    // Option A: replace selection with the text (if something selected, it will be replaced)
    const tr = state.tr.insertText(snippet, from, to);

    // Option B (alternative): insert as a node or block — see notes below.
    // const node = state.schema.text(snippet);
    // const tr = state.tr.replaceRangeWith(from, to, node);

    view.dispatch(tr);
    view.focus(); // move focus back to the editor
  };

  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      New Slide
    </Button>
  );
}
