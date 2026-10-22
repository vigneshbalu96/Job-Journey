import { NextResponse } from "next/server";
import { documents } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { findOne } from "@/lib/repo";
import { createSupabaseAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

/** Ownership is checked via the scoped lookup; then a 5-minute signed URL is issued. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
  const doc = await findOne({ userId }, documents, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.storagePath, 300, {
    download: `${doc.name}-v${doc.version}${extensionFor(doc.mimeType)}`,
  });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not sign" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

function extensionFor(mime: string) {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "text/markdown":
      return ".md";
    default:
      return ".txt";
  }
}
