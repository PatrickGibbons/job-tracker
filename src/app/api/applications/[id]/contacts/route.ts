import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applicationContacts, contacts } from "@/db/schema";
import { logActivity } from "@/lib/activity-logger";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: applicationContacts.id,
      relationship: applicationContacts.relationship,
      contactId: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      role: contacts.role,
      company: contacts.company,
    })
    .from(applicationContacts)
    .innerJoin(contacts, eq(applicationContacts.contactId, contacts.id))
    .where(eq(applicationContacts.applicationId, Number(id)));

  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const { contactId, relationship } = await req.json();

  const [existing] = await db
    .select()
    .from(applicationContacts)
    .where(
      and(
        eq(applicationContacts.applicationId, appId),
        eq(applicationContacts.contactId, Number(contactId))
      )
    );

  if (existing) {
    return NextResponse.json({ error: "Contact already linked" }, { status: 409 });
  }

  const [link] = await db
    .insert(applicationContacts)
    .values({ applicationId: appId, contactId: Number(contactId), relationship })
    .returning();

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, Number(contactId)));

  await logActivity({
    applicationId: appId,
    activityType: "contact_linked",
    description: `Linked contact: ${contact?.name ?? "Unknown"}`,
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appId = Number(id);
  const { contactId } = await req.json();

  const [link] = await db
    .select()
    .from(applicationContacts)
    .where(
      and(
        eq(applicationContacts.applicationId, appId),
        eq(applicationContacts.contactId, Number(contactId))
      )
    );
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(applicationContacts)
    .where(
      and(
        eq(applicationContacts.applicationId, appId),
        eq(applicationContacts.contactId, Number(contactId))
      )
    );

  await logActivity({
    applicationId: appId,
    activityType: "contact_unlinked",
    description: "Contact unlinked",
  });

  return NextResponse.json({ success: true });
}
