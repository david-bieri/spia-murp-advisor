// src/app/api/feedback/route.ts
// Phase 2 completion item — logs thumbs feedback to console
// Phase 4: replace console.log with Vercel KV persistence

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messageIndex, type } = await req.json();

    // Validate
    if (typeof messageIndex !== "number" || (type !== "up" && type !== "down")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Phase 2: log only. Phase 4: persist to Vercel KV.
    console.log(`[jane-feedback] type=${type} messageIndex=${messageIndex}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
