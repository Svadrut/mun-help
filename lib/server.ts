import { createOpenAI } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const model = openai(process.env.OPENAI_MODEL ?? "gpt-6-luna");

// If APP_PASSWORD is set, every API call must send it. Without this, anyone who
// finds the deployed site can spend your OpenAI credit.
export function checkPassword(request: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected || request.headers.get("x-app-password") === expected) return null;
  return NextResponse.json({ error: "Wrong or missing password" }, { status: 401 });
}

export function errorResponse(error: unknown) {
  console.error(error);
  // Report OpenAI failures as 502 so the browser never mistakes OpenAI's 401 for a wrong site password.
  const upstream = typeof error === "object" && error !== null && "statusCode" in error;
  const status = upstream ? (error.statusCode === 429 ? 429 : 502) : 500;
  const message = error instanceof Error ? error.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status });
}
