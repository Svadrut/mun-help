"use client";

import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import React, { useEffect, useState, useRef } from "react";
import { createEditor, Editor as ProseKitEditor } from "prosekit/core";
import { ProseKit } from "prosekit/react";
import { defineBasicExtension } from "prosekit/basic";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { union } from "prosekit/core";
import type { Uploader } from "prosekit/extensions/file";

import { Toolbar } from "./editor/ui/toolbar";
import { InlineMenu } from "./editor/ui/inline-menu";

const simpleUploader: Uploader<string> = ({ file, onProgress }) => {
  return new Promise((resolve) => {
    onProgress({ loaded: 0, total: file.size });
    setTimeout(() => {
      onProgress({ loaded: file.size, total: file.size });
      resolve(URL.createObjectURL(file));
    }, 100);
  });
};

function defineLessonExtension() {
  return union(
    defineBasicExtension(),
    definePlaceholder({ placeholder: "Start writing your lesson content..." })
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

export default function LessonEditor({ content, onChange }: LessonEditorProps) {
  const [editor, setEditor] = useState<ProseKitEditor | null>(null);
  const createdRef = useRef(false); // used for debugging / avoiding double-init
  const lastSentJSON = useRef<any>(null);

  // Create/destroy editor whenever `content` changes (or on mount).
  useEffect(() => {
    const extension = defineLessonExtension();

    // Create editor with the incoming content or default
    const initial = content ?? defaultEmptyContent;
    const e = createEditor({
      extension,
      defaultContent: initial,
      // Add other options here if you need uploader, etc.
    });

    // Optional: ensure previous editor is destroyed before replacing
    setEditor((prev) => {
      try {
        if (prev && typeof (prev as any).destroy === "function") {
          (prev as any).destroy();
        }
      } catch (err) {
        // ignore
      }
      return e;
    });

    // cleanup on unmount
    return () => {
      try {
        if (e && typeof (e as any).destroy === "function") {
          (e as any).destroy();
        }
      } catch (err) {
        // ignore
      }
    };
    // Intentionally depend on `content` so we recreate the editor with new defaultContent
  }, [content]);

  // Wire up onChange via overriding view.dispatch after editor mounts
  useEffect(() => {
    if (!editor || !onChange) return;

    const view = editor.view;
    if (!view) return;

    const originalDispatch = view.dispatch;
    let lastJSONLocal: any = null;

    view.dispatch = (tr: any) => {
      // call original to apply transaction
      originalDispatch.call(view, tr);
      // now read updated doc
      try {
        const currentJSON = editor.state.doc.toJSON();
        // only call onChange when content truly changes
        if (JSON.stringify(currentJSON) !== JSON.stringify(lastJSONLocal)) {
          lastJSONLocal = currentJSON;
          lastSentJSON.current = currentJSON;
          onChange(currentJSON);
        }
      } catch (err) {
        // swallow errors to avoid breaking editor
        console.error("Error reading editor doc:", err);
      }
    };

    return () => {
      // restore original when editor changes / unmounts
      try {
        if (view && originalDispatch) view.dispatch = originalDispatch;
      } catch (err) {
        // ignore
      }
    };
  }, [editor, onChange]);

  // Safety: if parent `content` and last sent content are identical, nothing to do.
  // We already recreate editor on content change so this is just informative/debug.
  useEffect(() => {
    if (!editor) return;
    const cur = lastSentJSON.current;
    if (cur && content && JSON.stringify(cur) === JSON.stringify(content)) {
      // already in sync
      return;
    }
    // If editor exists but was created with different content and `setContent`
    // isn't available/working, we rely on recreating editor via effect above.
  }, [content, editor]);

  // If the library internally caches DOM or doesn't re-mount correctly, forcing a React
  // remount of <ProseKit> by using a key generated from the content helps.
  const wrapperKey = useRef<string | null>(null);
  try {
    wrapperKey.current = content ? JSON.stringify(content).slice(0, 10000) : "empty";
  } catch {
    wrapperKey.current = "content-key";
  }

  return (
    <>
      {editor ? (
        <ProseKit editor={editor} key={wrapperKey.current ?? undefined}>
          <div className="box-border w-full min-h-[400px] overflow-hidden rounded-md border border-input bg-background shadow-sm flex flex-col">
            <Toolbar newSlide={true} />
            <div className="relative w-full flex-1 box-border overflow-y-auto">
              <div
                ref={editor.mount}
                className="ProseMirror box-border min-h-full px-4 py-4 outline-hidden outline-0"
              />
              <InlineMenu />
            </div>
          </div>
        </ProseKit>
      ) : (
        // while editor is being created (very short), render a placeholder
        <div className="min-h-[200px] w-full flex items-center justify-center text-sm text-muted-foreground">
          Loading editor…
        </div>
      )}
    </>
  );
}
