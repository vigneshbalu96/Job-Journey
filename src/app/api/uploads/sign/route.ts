import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { createSupabaseAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { uploadSignRequest } from "@/schemas";

/** Mints a one-shot signed upload URL under the caller's own prefix. */
export async function POST(request: Request) {
  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
  const parsed = uploadSignRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const safeName = parsed.data.fileName.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const path = `${userId}/${randomUUID()}-${safeName}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not sign upload" }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
