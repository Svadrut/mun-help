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

// build nodes mapping that includes ProseKit node names
const nodes = {
  // keep all the default prosemirror handlers
  ...defaultMarkdownSerializer.nodes,

  // generic "list" node (if your ProseKit schema uses a single `list` node)
  list(state: any, node: any) {
    // assume node.attrs.type === "ordered" or "bullet", and maybe node.attrs.start
    const isOrdered = node.attrs?.type === "ordered";
    const start = node.attrs?.start ?? 1;
    state.renderList(node, "  ", (i: number) =>
      isOrdered ? `${start + i}. ` : "- "
    );
  },

  // ProseKit-specific names (if used)
  bulletList(state: any, node: any) {
    state.renderList(node, "  ", () => "- ");
  },

  orderedList(state: any, node: any) {
    const start = node.attrs?.start ?? 1;
    state.renderList(node, "  ", (i: number) => `${start + i}. `);
  },

  // ProseKit listItem -> prosemirror's list_item implementation
  listItem: defaultMarkdownSerializer.nodes.list_item,
};

// reuse mark serializers from default
const marks = {
  ...defaultMarkdownSerializer.marks,

  // ProseKit bold → **text**
  bold: {
    open: "**",
    close: "**",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // ProseKit italic → *text*
  italic: {
    open: "*",
    close: "*",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // --- ADD THIS ---
  // ProseKit strikethrough → ~~text~~
  strikethrough: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  },

  // If your schema uses `strike` instead:
  strike: {
    open: "~~",
    close: "~~",
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
        eq(membership.role, "admin")
      )
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
      and(eq(lesson.school_id, dbUser.school_id), eq(lesson.id, parseInt(id)))
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
        eq(submission.user_id, dbUser.id)
      )
    )
    .limit(1);

  const alreadySubmitted = hasSubmission.length > 0;

  console.log((alreadySubmitted))

  return (
    <LessonViewer
      doc={JSON.parse(viewLesson[0].content_markdown)}
      id={id}
      title={viewLesson[0].title}
      alreadySubmitted={alreadySubmitted}
    />
  );
}
