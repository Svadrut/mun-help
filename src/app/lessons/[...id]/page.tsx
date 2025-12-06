import { currentUser } from "@clerk/nextjs/server";
import { LessonViewer } from "./lesson-viewer";
import { redirect } from "next/navigation";
import { db } from "@/src/db/drizzle";
import { lesson, membership, submission, user } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { remark } from "remark";
import html from "remark-html";
import { defineBasicExtension } from "prosekit/basic";
import { NodeJSON } from "prosekit/core";
import {
  defaultMarkdownSerializer,
  MarkdownSerializer,
} from "prosemirror-markdown";
import { Node as ProseMirrorNode, DOMSerializer } from "prosemirror-model";

// build nodes mapping that includes all ProseKit node names
const nodes = {
  // keep all the default prosemirror handlers
  ...defaultMarkdownSerializer.nodes,

  // Heading nodes (h1-h6)
  heading(state: any, node: any) {
    const level = node.attrs?.level || 1;
    const hashes = "#".repeat(level);
    state.write(hashes + " ");
    state.renderContent(node);
    state.closeBlock(node);
  },

  // Blockquote
  blockquote(state: any, node: any) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node));
  },

  // Code block
  code_block(state: any, node: any) {
    const info = node.attrs?.language || "";
    state.write("```" + info + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  },

  // Horizontal rule
  horizontal_rule(state: any, node: any) {
    state.write(node.attrs?.markup || "---");
    state.closeBlock(node);
  },

  // Hard break
  hardBreak(state: any, node: any, parent: any, index: number) {
    state.write("  \n");
  },
  hard_break(state: any) {
    state.write("  \n");
  },

  // Image
  image(state: any, node: any) {
    const src = node.attrs?.src || "";
    const alt = node.attrs?.alt || "";
    const title = node.attrs?.title || "";
    const titlePart = title ? ` "${title}"` : "";
    state.write(`![${alt}](${src}${titlePart})`);
  },

  // Table support
  table(state: any, node: any) {
    state.ensureNewLine();
    let isFirstRow = true;
    node.content.forEach((row: any, i: number) => {
      if (!isFirstRow) state.ensureNewLine();
      isFirstRow = false;
      state.write("| ");
      let isFirstCell = true;
      row.content.forEach((cell: any) => {
        if (!isFirstCell) state.write(" | ");
        isFirstCell = false;
        state.renderInline(cell);
      });
      state.write(" |");
      // Add separator after header row
      if (i === 0) {
        state.ensureNewLine();
        state.write("|");
        for (let k = 0; k < row.childCount; k++) {
          state.write(" --- |");
        }
      }
    });
    state.ensureNewLine();
    state.closeBlock(node);
  },
  table_row(state: any, node: any) {
    state.write("| ");
    let first = true;
    node.content.forEach((cell: any) => {
      if (!first) state.write(" | ");
      first = false;
      state.renderInline(cell);
    });
    state.write(" |");
    state.ensureNewLine();
  },
  table_cell(state: any, node: any) {
    state.renderInline(node);
  },
  table_header(state: any, node: any) {
    state.renderInline(node);
  },

  // Generic list node
  list(state: any, node: any) {
    const isOrdered = node.attrs?.type === "ordered";
    const start = node.attrs?.start ?? 1;
    state.renderList(node, "  ", (i: number) =>
      isOrdered ? `${start + i}. ` : "- ",
    );
  },

  // ProseKit-specific list names
  bulletList(state: any, node: any) {
    state.renderList(node, "  ", () => "- ");
  },

  orderedList(state: any, node: any) {
    const start = node.attrs?.start ?? 1;
    state.renderList(node, "  ", (i: number) => `${start + i}. `);
  },

  // List item
  listItem: defaultMarkdownSerializer.nodes.list_item,
};

// Complete mark serializers for all ProseKit marks
const marks = {
  ...defaultMarkdownSerializer.marks,

  // Bold → **text**
  bold: {
    open: "**",
    close: "**",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // Italic → *text*
  italic: {
    open: "*",
    close: "*",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // Strikethrough → ~~text~~
  strikethrough: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  },
  strike: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // Underline (markdown doesn't have native underline, use HTML)
  underline: {
    open: "<u>",
    close: "</u>",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // Inline code → `text`
  code: {
    open: "`",
    close: "`",
    mixable: false,
    expelEnclosingWhitespace: true,
  },

  // Link → [text](url)
  link: {
    open: (state: any, mark: any) => "[",
    close: (state: any, mark: any) => {
      const href = mark.attrs?.href || "";
      const title = mark.attrs?.title || "";
      const titlePart = title ? ` "${title}"` : "";
      return `](${href}${titlePart})`;
    },
    mixable: true,
    expelEnclosingWhitespace: true,
  },
};

// create serializer
const mySerializer = new MarkdownSerializer(nodes, marks);

export function saveAsMarkdown(json: NodeJSON) {
  const schema = defineBasicExtension().schema!;

  const pmNode = ProseMirrorNode.fromJSON(schema, json);

  const markdown = mySerializer.serialize(pmNode);

  return markdown;
}

export default async function ViewLesson({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Get the current user from the database
  const currentDbUser = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerkUser.id))
    .limit(1);

  if (currentDbUser.length === 0) {
    redirect("/onboard");
  }

  const dbUser = currentDbUser[0];

  // Check if user is an admin
  const userMembership = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.user_id, dbUser.id),
        eq(membership.school_id, dbUser.school_id),
        eq(membership.role, "admin"),
      ),
    )
    .limit(1);

  if (userMembership.length > 0) {
    redirect("/admin/view-lessons");
  }

  // Get all pending requests for this school
  const { id } = await params;

  const viewLesson = await db
    .select()
    .from(lesson)
    .where(
      and(eq(lesson.school_id, dbUser.school_id), eq(lesson.id, parseInt(id))),
    );

  if (viewLesson.length === 0) {
    redirect("/lessons");
  }

  const hasSubmission = await db
    .select()
    .from(submission)
    .where(
      and(
        eq(submission.lesson_id, parseInt(id)),
        eq(submission.user_id, dbUser.id),
      ),
    )
    .limit(1);

  const alreadySubmitted = hasSubmission.length > 0;

  console.log(alreadySubmitted);

  return (
    <LessonViewer
      doc={JSON.parse(viewLesson[0].content_markdown)}
      id={id}
      title={viewLesson[0].title}
      alreadySubmitted={alreadySubmitted}
    />
  );
}
