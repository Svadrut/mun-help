// Drizzle ORM (Postgres) schema for MUN Training Platform
// File: drizzle_schema_mun_platform.ts
// Notes:
// - Page break token suggestion: use `<!-- PAGE -->` inside lesson markdown to indicate slide/page breaks.
//   This token is HTML-style, safe in markdown, easy to split on server-side, and won't collide with
//   normal markdown horizontal rules. Example: "Some text\n\n<!-- PAGE -->\n\nNext slide text"
// - This schema covers: schools, users, memberships (roles: student/teacher/admin), lessons, resources,
//   submissions, grades (AI + teacher comments + speaking metrics), and basic auditing fields.

import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  json,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const membershipRole = pgEnum("membership_role", ["student", "admin"]);
export const lessonType = pgEnum("lesson_type", [
  "writing",
  "speaking",
  "both",
]);
export const resourceType = pgEnum("resource_type", [
  "document",
  "video",
  "link",
  "other",
]);
export const submissionStatus = pgEnum("submission_status", [
  "draft",
  "submitted",
  "graded",
  "resubmitted",
]);
export const requestStatus = pgEnum("request_status", ["pending", "approved", "rejected"]);

// Schools (one per school/club) -- "each school gets a group of students"
export const school = pgTable("school", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Users
export const user = pgTable(
  "user",
  {
    id: serial("id").primaryKey(),
    clerk_id: text("clerk_id").notNull(),
    school_id: integer("school_id")
      .references(() => school.id)
      .notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    display_name: varchar("display_name", { length: 255 }),
    // Minimal auth fields; actual auth may be handled by an external provider (Supabase/Auth)
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_school_id_idx").on(table.school_id),
    index("user_email_idx").on(table.email),
  ]
);

// Memberships link users to roles (student/teacher/admin) inside a school
export const membership = pgTable(
  "membership",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => user.id)
      .notNull(),
    school_id: integer("school_id")
      .references(() => school.id)
      .notNull(),
    role: membershipRole("role").notNull().default("student"),
    // allow granular "admin" privileges for progress viewing etc.
    can_view_progress: boolean("can_view_progress").default(false).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("membership_user_school_unique").on(table.user_id, table.school_id),
    index("membership_user_id_idx").on(table.user_id),
    index("membership_school_id_idx").on(table.school_id),
  ]
);

// Lessons table
export const lesson = pgTable(
  "lesson",
  {
    id: serial("id").primaryKey(),
    school_id: integer("school_id")
      .references(() => school.id)
      .notNull(),
    created_by: integer("created_by")
      .references(() => user.id)
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    // Optional headings array stored as JSON array of strings. Useful for a table-of-contents UI.
    headings: json("headings").$type<string[] | null>(),
    // Markdown body. Use the page-break token (see file header) to split into slides/pages.
    content_markdown: text("content_markdown").notNull(),
    // Optional reference video (a URL or an internal storage key)
    reference_video_url: text("reference_video_url"),
    // Grading guide that will be provided to the AI when grading student work
    grading_guide: text("grading_guide"),
    // lesson type: writing, speaking, or both
    type: lessonType("type").notNull().default("writing"),
    is_published: boolean("is_published").default(false).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("lesson_school_id_idx").on(table.school_id),
    index("lesson_created_by_idx").on(table.created_by),
    index("lesson_published_idx").on(table.is_published),
  ]
);

// Resource library (club-wide assets)
export const resource = pgTable(
  "resource",
  {
    id: serial("id").primaryKey(),
    school_id: integer("school_id")
      .references(() => school.id)
      .notNull(),
    uploaded_by: integer("uploaded_by")
      .references(() => user.id)
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    // url could point to S3/Neon storage or an external link
    file_url: text("file_url"),
    type: resourceType("type").notNull().default("document"),
    metadata: json("metadata").$type<Record<string, any> | null>(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("resource_school_id_idx").on(table.school_id),
    index("resource_uploaded_by_idx").on(table.uploaded_by),
  ]
);

// Submissions: when a student completes a practice block inside a lesson
export const submission = pgTable(
  "submission",
  {
    id: serial("id").primaryKey(),
    lesson_id: integer("lesson_id")
      .references(() => lesson.id)
      .notNull(),
    user_id: integer("user_id")
      .references(() => user.id)
      .notNull(),
    // text submission (for writing activities)
    content_markdown: text("content_markdown"),
    // audio / video for speaking activities (store object key or URL)
    media_url: text("media_url"),
    // transcript (generated via Whisper or similar)
    transcript: text("transcript"),
    // optional quick snapshot of speaking metrics before grading (pace, filler words, pauses)
    raw_metrics: json("raw_metrics").$type<Record<string, any> | null>(),
    status: submissionStatus("status").notNull().default("submitted"),
    submitted_at: timestamp("submitted_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("submission_lesson_user_submitted_idx").on(
      table.lesson_id,
      table.user_id,
      table.submitted_at
    ),
    index("submission_lesson_id_idx").on(table.lesson_id),
    index("submission_user_id_idx").on(table.user_id),
    index("submission_status_idx").on(table.status),
  ]
);

// Grades: AI and teacher grades and comments stored here. Each grade ties to a submission
export const grade = pgTable(
  "grade",
  {
    id: serial("id").primaryKey(),
    submission_id: integer("submission_id")
      .references(() => submission.id)
      .notNull(),
    lesson_id: integer("lesson_id")
      .references(() => lesson.id)
      .notNull(),
    user_id: integer("user_id")
      .references(() => user.id)
      .notNull(),
    // Numeric score - use an integer scale (e.g. 0-100) or float if preferred
    score: integer("score"),
    // AI feedback (structured + textual). Keep as text for long-form but also allow structured JSON in 'ai_metadata'.
    ai_comments: text("ai_comments"),
    ai_metadata: json("ai_metadata").$type<Record<string, any> | null>(),
    // Teacher comments and the teacher who gave them
    teacher_comments: text("teacher_comments"),
    graded_by: integer("graded_by").references(() => user.id),
    // Speaking-specific computed metrics (paced words/min, filler_count, avg_pitch etc.)
    speaking_metrics: json("speaking_metrics").$type<Record<
      string,
      any
    > | null>(),
    // Whether this grade is final for progress tracking or a draft
    is_final: boolean("is_final").default(true).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("grade_submission_id_idx").on(table.submission_id),
    index("grade_lesson_id_idx").on(table.lesson_id),
    index("grade_user_id_idx").on(table.user_id),
    index("grade_created_at_idx").on(table.created_at),
    index("grade_final_idx").on(table.is_final),
  ]
);

// Optional: teacher-provided model answers (useful for showing examples)
export const model_answer = pgTable(
  "model_answer",
  {
    id: serial("id").primaryKey(),
    lesson_id: integer("lesson_id")
      .references(() => lesson.id)
      .notNull(),
    created_by: integer("created_by")
      .references(() => user.id)
      .notNull(),
    content_markdown: text("content_markdown").notNull(),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("model_answer_lesson_id_idx").on(table.lesson_id),
    index("model_answer_created_by_idx").on(table.created_by),
  ]
);

// Relations
export const schoolRelations = relations(school, ({ many }) => ({
  users: many(user),
  memberships: many(membership),
  lessons: many(lesson),
  resources: many(resource),
  joinRequests: many(joinRequest),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  school: one(school, {
    fields: [user.school_id],
    references: [school.id],
  }),
  memberships: many(membership),
  lessonsCreated: many(lesson, {
    relationName: "lesson_creator",
  }),
  resourcesUploaded: many(resource),
  submissions: many(submission),
  grades: many(grade, {
    relationName: "grade_student",
  }),
  gradesGiven: many(grade, {
    relationName: "grade_grader",
  }),
  modelAnswers: many(model_answer),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
  user: one(user, {
    fields: [membership.user_id],
    references: [user.id],
  }),
  school: one(school, {
    fields: [membership.school_id],
    references: [school.id],
  }),
}));

export const lessonRelations = relations(lesson, ({ one, many }) => ({
  school: one(school, {
    fields: [lesson.school_id],
    references: [school.id],
  }),
  creator: one(user, {
    fields: [lesson.created_by],
    references: [user.id],
    relationName: "lesson_creator",
  }),
  submissions: many(submission),
  grades: many(grade),
  modelAnswers: many(model_answer),
}));

export const resourceRelations = relations(resource, ({ one }) => ({
  school: one(school, {
    fields: [resource.school_id],
    references: [school.id],
  }),
  uploader: one(user, {
    fields: [resource.uploaded_by],
    references: [user.id],
  }),
}));

export const submissionRelations = relations(submission, ({ one, many }) => ({
  lesson: one(lesson, {
    fields: [submission.lesson_id],
    references: [lesson.id],
  }),
  user: one(user, {
    fields: [submission.user_id],
    references: [user.id],
  }),
  grades: many(grade),
}));

export const gradeRelations = relations(grade, ({ one }) => ({
  submission: one(submission, {
    fields: [grade.submission_id],
    references: [submission.id],
  }),
  lesson: one(lesson, {
    fields: [grade.lesson_id],
    references: [lesson.id],
  }),
  student: one(user, {
    fields: [grade.user_id],
    references: [user.id],
    relationName: "grade_student",
  }),
  grader: one(user, {
    fields: [grade.graded_by],
    references: [user.id],
    relationName: "grade_grader",
  }),
}));

export const modelAnswerRelations = relations(model_answer, ({ one }) => ({
  lesson: one(lesson, {
    fields: [model_answer.lesson_id],
    references: [lesson.id],
  }),
  creator: one(user, {
    fields: [model_answer.created_by],
    references: [user.id],
  }),
}));

// School join requests
export const joinRequest = pgTable(
  "join_request",
  {
    id: serial("id").primaryKey(),
    school_id: integer("school_id")
      .references(() => school.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    clerk_id: text("clerk_id").notNull(),
    status: requestStatus("status").default("pending").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("join_request_school_id_idx").on(table.school_id),
    index("join_request_clerk_id_idx").on(table.clerk_id),
    index("join_request_status_idx").on(table.status),
  ]
);

// Example: splitting lesson content into pages (server-side pseudocode):
// const PAGE_TOKEN = '<!-- PAGE -->';
// const pages = lesson.content_markdown.split(PAGE_TOKEN).map(p => p.trim());

// Indexing & performance notes (add after initial MVP):
// - Add indexes on (lesson_id, user_id, submitted_at) for submissions
// - Add indexes on grades.user_id and grades.created_at for fast progress queries
// - Consider materialized views or precomputed aggregates for per-student progress graphs

// End of schema
