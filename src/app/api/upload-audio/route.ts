// app/api/upload-audio/route.ts
import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function POST(req: Request) {
  try {
    const { audioBase64, filename } = await req.json();

    if (!audioBase64) {
      return NextResponse.json(
        { error: "Missing audioBase64" },
        { status: 400 }
      );
    }

    // Parse data URL
    const match = audioBase64.match(/^data:(.+);base64,(.*)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid audioBase64 format" },
        { status: 400 }
      );
    }

    const mime = match[1];        // "audio/webm"
    const base64 = match[2];      // raw base64 data
    const buffer = Buffer.from(base64, "base64");

    // Convert to File (UploadThing example uses this)
    const file = new File(
      [buffer],
      filename ?? `recording-${Date.now()}.webm`,
      { type: mime }
    );

    // Upload exactly like UploadThing’s example
    const uploaded = await utapi.uploadFiles([file]);
    console.log(JSON.stringify(uploaded));

    return NextResponse.json({
      success: true,
      uploaded,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
