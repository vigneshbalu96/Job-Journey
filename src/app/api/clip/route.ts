import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { AiError } from "@/lib/ai/client";
import { extractJob, fetchPageText } from "@/lib/clip/extract";

export const maxDuration = 60;

const body = z.object({
  url: z.url().optional(),
  /** Rendered page text from the bookmarklet, or a pasted JD. */
  text: z.string().max(60_000).optional(),
  model: z.enum(["claude-sonnet-5-5", "claude-opus-5-5"]).optional(),
});

/**
 * Three sources in priority order: text supplied by the caller (bookmarklet or
 * paste), else a server fetch of the URL. JS-rendered boards return empty
 * shells to the server, so the UI tells the user to paste when that happens.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give a URL or some text" }, { status: 400 });
  const { url, model } = parsed.data;
  let text = parsed.data.text?.trim() ?? "";
  let source: "text" | "fetch" = "text";

  if (text.length < 200) {
    if (!url) return NextResponse.json({ error: "Paste the job description or give a URL" }, { status: 400 });
    try {
      const page = await fetchPageText(url);
      if (!page) return NextResponse.json({ error: "That page renders with JavaScript, so the server only sees an empty shell. Use the bookmarklet on the page, or paste the description.", code: "empty_shell" }, { status: 422 });
      text = page.text;
      source = "fetch";
    } catch (e) {
      return NextResponse.json({ error: `Could not fetch the page: ${e instanceof Error ? e.message : String(e)}. Paste the description instead.`, code: "fetch_failed" }, { status: 422 });
    }
  }

  try {
    const result = await extractJob(userId, { url, text, model });
    return NextResponse.json({ ...result, source });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "not_configured" ? 503 : 422 });
    throw e;
  }
}
