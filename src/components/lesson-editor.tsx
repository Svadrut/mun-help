"use client";

import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import React, { useMemo, useEffect } from "react";
import { createEditor } from "prosekit/core";
import { ProseKit, useEditor } from "prosekit/react";
import { defineBasicExtension } from "prosekit/basic";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { union } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";

import { Toolbar } from "./editor/ui/toolbar";
import { InlineMenu } from "./editor/ui/inline-menu";

// Simple uploader that doesn't actually upload (for now)
const simpleUploader: Uploader<string> = ({
  file,
  onProgress,
}): Promise<string> => {
  return new Promise((resolve) => {
    // Simulate progress
    onProgress({ loaded: 0, total: file.size });
    setTimeout(() => {
      onProgress({ loaded: file.size, total: file.size });
      // Return a placeholder URL - in production, upload to your storage
      resolve(URL.createObjectURL(file));
    }, 100);
  });
};

function defineLessonExtension() {
  return union(
    defineBasicExtension(),
    definePlaceholder({
      placeholder:
        "Start writing your lesson instructions...",
    })
  );
}

interface LessonEditorProps {
  content?: any;
  onChange?: (content: any) => void;
}

// Default empty content with at least one paragraph node
const defaultEmptyContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

export default function GuideLineEditor({
  content,
  onChange,
}: LessonEditorProps) {
  const editor = useMemo(() => {
    const extension = defineLessonExtension();
    return createEditor({
      extension,
      defaultContent: content || defaultEmptyContent,
    });
  }, []);

  // Handle content changes from editor
  useEffect(() => {
    if (onChange && editor) {
      // Listen to ProseMirror state updates
      const view = editor.view;
      if (view) {
        // Store the original dispatchTransaction
        const originalDispatch = view.dispatch;
        let lastJSON: any = null;

        // Override dispatch to catch all updates
        view.dispatch = (tr: any) => {
          originalDispatch.call(view, tr);
          // Get JSON after transaction is applied
          const currentJSON = editor.state.doc.toJSON();
          // Only call onChange if content actually changed
          if (JSON.stringify(currentJSON) !== JSON.stringify(lastJSON)) {
            lastJSON = currentJSON;
            onChange(currentJSON);
          }
        };

        return () => {
          // Restore original dispatch
          view.dispatch = originalDispatch;
        };
      }
    }
  }, [editor, onChange]);

  return (
    <ProseKit editor={editor}>
      <div className="box-border w-full min-h-[400px] overflow-hidden rounded-md border border-input bg-background shadow-sm flex flex-col">
        <Toolbar newSlide={true} />
        <div className="relative w-full flex-1 box-border overflow-y-auto">
          <div
            ref={editor.mount}
            className="ProseMirror box-border min-h-full px-4 py-4 outline-hidden outline-0"
          />
          <InlineMenu />
          {/* <SlashMenu /> */}
          {/* <BlockHandle /> */}
          {/* <DropIndicator /> */}
        </div>
      </div>
    </ProseKit>
  );
}
