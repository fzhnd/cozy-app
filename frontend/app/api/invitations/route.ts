import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Ensure Invitations table exists in Supabase PostgreSQL
async function ensureInvitationsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Invitations" (
      "id" TEXT PRIMARY KEY,
      "senderEmail" TEXT NOT NULL,
      "senderName" TEXT NOT NULL,
      "senderImage" TEXT,
      "receiverEmail" TEXT,
      "receiverName" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "targetName" TEXT NOT NULL,
      "groupId" TEXT,
      "channelId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

// GET: Retrieve invitations for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: true, invitations: [] }, { status: 200 });
    }

    await ensureInvitationsTable();

    const myEmail = session.user.email.toLowerCase().trim();
    const myName = (session.user.name || myEmail.split("@")[0]).toLowerCase().trim();

    // Auto-expire invitations older than 25 minutes
    await prisma.$executeRawUnsafe(`
      UPDATE "Invitations"
      SET "status" = 'expired', "updatedAt" = NOW()
      WHERE "status" = 'active' AND "createdAt" < NOW() - INTERVAL '25 minutes';
    `);

    // Fetch invitations directed to me
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Invitations" 
       WHERE LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2 
       ORDER BY "createdAt" DESC LIMIT 30;`,
      myEmail,
      myName
    );

    const invitations = rows.map((r, idx) => ({
      id: r.id || `inv_${idx}`,
      senderEmail: r.senderEmail,
      name: r.senderName,
      seed: r.senderName,
      avatar: r.senderImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.senderName}&backgroundColor=A577FF`,
      receiverEmail: r.receiverEmail,
      receiverName: r.receiverName,
      type: r.type,
      targetName: r.targetName,
      game: r.type === 'game_invite' ? r.targetName : undefined,
      activity: r.type === 'activity' ? r.targetName : undefined,
      channel: r.type === 'channel_invite' ? r.targetName : undefined,
      groupName: r.type === 'group_invite' ? r.targetName : undefined,
      groupId: r.groupId,
      channelId: r.channelId,
      status: r.status,
      time: formatRelativeTime(new Date(r.createdAt)),
      read: false,
      createdAt: r.createdAt
    }));

    // Fetch invitations sent by current user (to observe if recipient accepted)
    const sentRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Invitations" 
       WHERE LOWER("senderEmail") = $1 OR LOWER("senderName") = $2 
       ORDER BY "createdAt" DESC LIMIT 30;`,
      myEmail,
      myName
    );

    const sentInvitations = sentRows.map((r, idx) => ({
      id: r.id || `inv_sent_${idx}`,
      senderEmail: r.senderEmail,
      name: r.senderName,
      receiverEmail: r.receiverEmail,
      receiverName: r.receiverName,
      type: r.type,
      targetName: r.targetName,
      status: r.status,
      time: formatRelativeTime(new Date(r.createdAt)),
      createdAt: r.createdAt
    }));

    return NextResponse.json({ success: true, invitations, sentInvitations }, { status: 200 });
  } catch (error: any) {
    console.error("GET Invitations error:", error);
    return NextResponse.json({ success: false, invitations: [], sentInvitations: [], error: error.message }, { status: 500 });
  }
}

// POST: Send a new invitation
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverName, receiverEmail, type = 'activity', targetName, groupId, channelId } = body;

    if (!receiverName && !receiverEmail) {
      return NextResponse.json({ message: "Receiver is required" }, { status: 400 });
    }

    if (!targetName) {
      return NextResponse.json({ message: "Target name is required" }, { status: 400 });
    }

    await ensureInvitationsTable();

    const senderEmail = session.user.email.toLowerCase().trim();
    const senderName = session.user.name?.trim() || senderEmail.split('@')[0];
    const senderImage = session.user.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${senderName}&backgroundColor=A577FF`;

    // Attempt to resolve receiver email if not supplied
    let finalReceiverEmail = receiverEmail?.toLowerCase() || '';
    let finalReceiverName = receiverName?.trim() || '';

    if (!finalReceiverEmail && finalReceiverName) {
      const dbUser = await prisma.user.findFirst({
        where: { name: { equals: finalReceiverName, mode: "insensitive" } }
      });
      if (dbUser?.email) finalReceiverEmail = dbUser.email.toLowerCase();
    }

    const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Invitations" 
        ("id", "senderEmail", "senderName", "senderImage", "receiverEmail", "receiverName", "type", "targetName", "groupId", "channelId", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', NOW(), NOW());`,
      invId,
      senderEmail,
      senderName,
      senderImage,
      finalReceiverEmail,
      finalReceiverName,
      type,
      targetName,
      groupId || null,
      channelId || null
    );

    return NextResponse.json({
      success: true,
      invitation: {
        id: invId,
        senderName,
        receiverName: finalReceiverName,
        type,
        targetName,
        status: 'active'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST Invitations error:", error);
    return NextResponse.json({ message: "Failed to create invitation", error: error.message }, { status: 500 });
  }
}

// PATCH: End or expire an invitation (e.g. sender left session or room closed)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { invitationId, type, status = 'expired' } = body;

    await ensureInvitationsTable();

    const userEmail = session.user.email.toLowerCase().trim();
    const userName = (session.user.name || userEmail.split("@")[0]).toLowerCase().trim();

    if (invitationId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2;`,
        status,
        invitationId
      );
    } else if (status === 'accepted') {
      // Receiver accepting an invitation
      const targetSender = (body.senderName || '').toLowerCase().trim();
      const targetType = body.type || 'activity';
      if (targetSender) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() 
           WHERE (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
             AND LOWER("senderName") = $3
             AND "type" = $4
             AND "status" = 'active';`,
          userEmail,
          userName,
          targetSender,
          targetType
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() 
           WHERE (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
             AND "type" = $3
             AND "status" = 'active';`,
          userEmail,
          userName,
          targetType
        );
      }
    } else if (type) {
      // Expire all active invitations sent by this user for the specified type
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = $1, "updatedAt" = NOW() WHERE LOWER("senderEmail") = $2 AND "type" = $3 AND "status" = 'active';`,
        status,
        userEmail,
        type
      );
    }

    return NextResponse.json({ success: true, message: `Invitations marked as ${status}` }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Invitations error:", error);
    return NextResponse.json({ message: "Failed to update invitations", error: error.message }, { status: 500 });
  }
}

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
