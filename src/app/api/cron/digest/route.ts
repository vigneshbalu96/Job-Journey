import { NextResponse } from "next/server";
import { runDigest } from "@/lib/digest/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron hits this hourly (see vercel.json). Protected by CRON_SECRET. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const at = url.searchParams.get("at"); // ISO override for testing a specific hour
  const result = await runDigest(at ? new Date(at) : new Date(), { dryRun });
  return NextResponse.json(result);
}
