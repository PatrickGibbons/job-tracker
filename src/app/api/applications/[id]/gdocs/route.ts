import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { googleDocs } from "@/db/schema";
import { createGoogleDoc } from "@/lib/google-drive";
import { logActivity } from "@/lib/activity-logger";
import { eq } from "drizzle-orm";

function extractGoogleDocFileId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(googleDocs)
    .where(eq(googleDocs.applicationId, Number(id)));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const { name, url } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let fileId: string;
  let fileUrl: string;
  let description: string;

  if (url?.trim()) {
    // Link existing Google Doc
    const extracted = extractGoogleDocFileId(url.trim());
    if (!extracted) {
      return NextResponse.json(
        { error: "Could not extract a Google Doc ID from that URL. Make sure it's a Google Docs link." },
        { status: 400 }
      );
    }
    fileId = extracted;
    fileUrl = url.trim();
    description = `Google Doc linked: ${name.trim()}`;
  } else {
    // Create new Google Doc
    try {
      ({ fileId, fileUrl } = await createGoogleDoc(name.trim()));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google Drive error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    description = `Google Doc created: ${name.trim()}`;
  }

  const [record] = await db
    .insert(googleDocs)
    .values({ applicationId: appId, name: name.trim(), googleFileId: fileId, googleFileUrl: fileUrl, isLinked: !!url?.trim() })
    .returning();

  await logActivity({ applicationId: appId, activityType: "doc_linked", description });

  return NextResponse.json(record, { status: 201 });
}
