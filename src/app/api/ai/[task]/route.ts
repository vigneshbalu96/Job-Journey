import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { AiError } from "@/lib/ai/client";
import { aiRequestSchema, runApplicationTask } from "@/lib/ai/run-task";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ task: string }> }) {
  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
  const { task } = await params;
  const parsed = aiRequestSchema.safeParse({ ...(await request.json().catch(() => ({}))), task });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const result = await runApplicationTask(userId, parsed.data);
    if (parsed.data.task === "fit_score") revalidatePath(`/applications/${parsed.data.applicationId}`);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiError) {
      const status = e.code === "not_configured" ? 503 : e.code === "cap_reached" ? 429 : 422;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
