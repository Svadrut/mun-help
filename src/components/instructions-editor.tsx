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
import { definePasteHandler } from "prosekit/core";
import { defineMarkPasteRule } from "prosekit/extensions/paste-rule";
import { Slice, Fragment } from "prosemirror-model";

// Helper function to filter out image nodes from a fragment
function filterImageNodesFromFragment(fragment: Fragment, schema: any): Fragment {
  const filtered: any[] = [];
  
  fragment.forEach((node) => {
    if (node.type.name === "image") {
      // Skip image nodes
      return;
    }
    
    // Recursively filter child nodes if the node has content
    if (node.content && node.content.size > 0) {
      const filteredContent = filterImageNodesFromFragment(node.content, schema);
      // Only keep the node if it has content after filtering
      if (filteredContent.size > 0) {
        // Create a new node with filtered content
        const newNode = node.type.create(
          node.attrs,
          filteredContent,
          node.marks
        );
        filtered.push(newNode);
      }
    } else {
      // Leaf node without content (like text nodes)
      filtered.push(node);
    }
  });
  
  return Fragment.from(filtered);
}

// define extension - filter out image nodes but allow other content
function defineBlockImagePasteExtension() {
  return definePasteHandler((view, event, slice) => {
    if (!slice) return false;
    
    const schema = view.state.schema;
    let hasImage = false;
    
    // Check if slice contains image nodes
    slice.content.descendants((node) => {
      if (node.type.name === "image") {
        hasImage = true;
        return false; // Stop traversing
      }
    });
    
    if (hasImage) {
      // Filter out image nodes
      const filteredContent = filterImageNodesFromFragment(slice.content, schema);
      
      // If there's no content left after filtering, block the paste
      if (filteredContent.size === 0) {
        event.preventDefault();
        return true;
      }
      
      // Create a new slice without images
      const filteredSlice = new Slice(
        filteredContent,
        slice.openStart,
        slice.openEnd
      );
      
      // Insert the filtered slice
      const { state, dispatch } = view;
      const tr = state.tr.replaceSelection(filteredSlice);
      dispatch(tr);
      
      event.preventDefault();
      return true; // Signal handled
    }

    return false; // let other handlers / default behavior run
  });
}

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
  const basicExt = defineBasicExtension();
  
  // Try using mark paste rule to block image markdown syntax in text
  // This catches markdown image syntax like ![alt](url) in pasted text
  let imageMarkdownRule: any = null;
  const schema = basicExt.schema;
  if (schema) {
    const markType = schema.marks.link || schema.marks.bold || Object.values(schema.marks)[0];
    if (markType) {
      imageMarkdownRule = defineMarkPasteRule({
        regex: /!\[([^\]]*)\]\(([^)]+)\)/g,
        type: markType,
        shouldSkip: () => true, // Skip applying mark = block the match
      });
    }
  }
  
  const extensions = [
    basicExt,
    definePlaceholder({
      placeholder: "Start writing activity instructions...",
    }),
    defineBlockImagePasteExtension(),
  ];
  
  if (imageMarkdownRule) {
    extensions.push(imageMarkdownRule);
  }
  
  return union(...extensions);
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

export default function InstructionsEditor({
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

  useEffect(() => {
    if (!editor || !content) return;
  
    const currentJSON = editor.state.doc.toJSON();
  
    // Avoid unnecessary reset
    if (JSON.stringify(currentJSON) === JSON.stringify(content)) return;
  
    // Update the editor with new content
    editor.setContent(content);
  }, [content, editor]);

  return (
    <ProseKit editor={editor}>
      <div className="box-border w-full min-h-[400px] overflow-hidden rounded-md border border-input bg-background shadow-sm flex flex-col">
        <Toolbar />
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
