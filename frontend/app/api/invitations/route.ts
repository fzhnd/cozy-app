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
    ALTER TABLE IF EXISTS "Invitations" ENABLE ROW LEVEL SECURITY;
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

    // Fetch all active sessions (listening together, watch together, photobooth)
    const activeActivityRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Invitations" 
       WHERE "status" IN ('active', 'accepted')
         AND (LOWER("senderEmail") = $1 OR LOWER("senderName") = $2 
              OR LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
       ORDER BY "updatedAt" DESC LIMIT 30;`,
      myEmail,
      myName
    );

    const formatSession = (row: any) => {
      if (!row) return null;
      const isHost = (row.senderEmail?.toLowerCase() === myEmail || row.senderName?.toLowerCase() === myName);
      const partnerName = isHost ? row.receiverName : row.senderName;
      const partnerImage = isHost ? null : row.senderImage;
      return {
        id: row.id,
        isHost,
        senderName: row.senderName,
        senderImage: row.senderImage,
        receiverName: row.receiverName,
        partnerName,
        partnerImage,
        type: row.type,
        targetName: row.targetName,
        status: row.status,
        updatedAt: row.updatedAt
      };
    };

    const activeListeningSession = formatSession(
      activeActivityRows.find(r => r.targetName?.toLowerCase() === 'listening together')
    );
    const activeWatchSession = formatSession(
      activeActivityRows.find(r => r.targetName?.toLowerCase() === 'watch together')
    );
    const activePhotoboothSession = formatSession(
      activeActivityRows.find(r => r.targetName?.toLowerCase() === 'photobooth' || r.type?.toLowerCase() === 'photobooth')
    );

    return NextResponse.json({ 
      success: true, 
      invitations, 
      sentInvitations, 
      activeListeningSession,
      activeWatchSession,
      activePhotoboothSession
    }, { status: 200 });
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

    // Expire any existing active invitations between these two users for the same type/target
    await prisma.$executeRawUnsafe(
      `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
       WHERE "type" = $1 AND "targetName" = $2
         AND ((LOWER("senderEmail") = $3 AND (LOWER("receiverName") = $4 OR LOWER("receiverEmail") = $5))
              OR (LOWER("senderName") = $6 AND (LOWER("receiverName") = $4 OR LOWER("receiverEmail") = $5)))
         AND "status" IN ('active', 'accepted');`,
      type,
      targetName,
      senderEmail,
      finalReceiverName.toLowerCase(),
      finalReceiverEmail.toLowerCase(),
      senderName.toLowerCase()
    );

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

// PATCH: Join, Leave, or Expire an invitation/session
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { invitationId, type, targetName, status, action, partnerName } = body;

    await ensureInvitationsTable();

    const userEmail = session.user.email.toLowerCase().trim();
    const userName = (session.user.name || userEmail.split("@")[0]).toLowerCase().trim();
    const target = (targetName || body.targetName || '').toLowerCase().trim();

    // 1. Participant Joins / Accepts
    if (action === 'join' || status === 'accepted') {
      if (invitationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() WHERE "id" = $1;`,
          invitationId
        );
      } else if (partnerName || body.senderName) {
        const partner = (partnerName || body.senderName).toLowerCase().trim();
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW()
           WHERE (
             (LOWER("senderName") = $1 AND (LOWER("receiverEmail") = $2 OR LOWER("receiverName") = $3))
             OR
             (LOWER("receiverName") = $1 AND (LOWER("senderEmail") = $2 OR LOWER("senderName") = $3))
           )
           ${target ? `AND (LOWER("targetName") = '${target}' OR LOWER("type") = '${target}')` : ''}
           AND "status" IN ('active', 'accepted');`,
          partner,
          userEmail,
          userName
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() 
           WHERE (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
             AND "type" = COALESCE($3, 'activity')
             AND "status" = 'active';`,
          userEmail,
          userName,
          type || 'activity'
        );
      }
      return NextResponse.json({ success: true, message: "Invitation joined/accepted" }, { status: 200 });
    }

    // 2. Participant Leaves (action === 'leave' or status === 'leave')
    if (action === 'leave' || status === 'leave') {
      const partner = (partnerName || body.senderName || '').toLowerCase().trim();
      const channelId = body.channelId;
      
      // Specifically handle Voice Room / Channel invitations (anyone can invite to room)
      if (type === 'channel_invite' || channelId) {
        // 1. If leaving user sent invitations to friends for this channel, expire those invitations
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
           WHERE "status" IN ('active', 'accepted')
             AND (LOWER("senderEmail") = $1 OR LOWER("senderName") = $2)
             AND ("type" = 'channel_invite' ${channelId ? `OR "channelId" = '${channelId}'` : ''} ${target ? `OR LOWER("targetName") = '${target}'` : ''});`,
          userEmail,
          userName
        );

        // 2. If leaving user was a guest who accepted an invitation to this channel, revert their invitation back to 'active'
        // so they can re-join anytime via their notifications as long as the person who invited them hasn't left!
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'active', "updatedAt" = NOW()
           WHERE "status" = 'accepted'
             AND (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
             AND ("type" = 'channel_invite' ${channelId ? `OR "channelId" = '${channelId}'` : ''} ${target ? `OR LOWER("targetName") = '${target}'` : ''});`,
          userEmail,
          userName
        );

        return NextResponse.json({ success: true, message: "Left channel session" }, { status: 200 });
      }

      // Default activity handling (Listening Together, Watch Together, Photobooth)
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "Invitations"
         WHERE "status" IN ('active', 'accepted')
           AND (
             (LOWER("senderEmail") = $1 OR LOWER("senderName") = $2)
             OR
             (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2)
           )
           ${partner ? `AND (LOWER("senderName") = '${partner}' OR LOWER("receiverName") = '${partner}')` : ''}
           ${target ? `AND (LOWER("targetName") = '${target}' OR LOWER("type") = '${target}')` : ''}
         ORDER BY "updatedAt" DESC LIMIT 1;`,
        userEmail,
        userName
      );

      if (rows.length > 0) {
        const inv = rows[0];
        const isHost = (inv.senderEmail?.toLowerCase() === userEmail || inv.senderName?.toLowerCase() === userName);
        
        if (isHost) {
          // Host leaves: Whole session ends and invitation is marked expired
          await prisma.$executeRawUnsafe(
            `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW() WHERE "id" = $1;`,
            inv.id
          );
          return NextResponse.json({ success: true, role: 'host', status: 'expired' }, { status: 200 });
        } else {
          // Guest leaves: Host remains in session, invitation reverts to 'active'
          // so the guest can still re-join anytime via notifications!
          await prisma.$executeRawUnsafe(
            `UPDATE "Invitations" SET "status" = 'active', "updatedAt" = NOW() WHERE "id" = $1;`,
            inv.id
          );
          return NextResponse.json({ success: true, role: 'guest', status: 'active' }, { status: 200 });
        }
      }
      return NextResponse.json({ success: true, message: "No active session to leave" }, { status: 200 });
    }

    // 3. Explicit Expire / Cancel (action === 'end' or status === 'expired')
    if (invitationId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW() WHERE "id" = $1;`,
        invitationId
      );
    } else if (partnerName) {
      const partner = partnerName.toLowerCase().trim();
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
         WHERE (
           (LOWER("senderName") = $1 AND (LOWER("receiverEmail") = $2 OR LOWER("receiverName") = $3))
           OR
           (LOWER("receiverName") = $1 AND (LOWER("senderEmail") = $2 OR LOWER("senderName") = $3))
         )
         AND "type" = COALESCE($4, 'activity');`,
        partner,
        userEmail,
        userName,
        type || 'activity'
      );
    } else if (type) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
         WHERE (LOWER("senderEmail") = $1 OR LOWER("senderName") = $2)
           AND "type" = $3
           AND "status" IN ('active', 'accepted');`,
        userEmail,
        userName,
        type
      );
    }

    return NextResponse.json({ success: true, message: `Invitations marked as expired` }, { status: 200 });

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
