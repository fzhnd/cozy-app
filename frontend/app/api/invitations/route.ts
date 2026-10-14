import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseTables } from "@/lib/dbInit";

let lastExpiredCleanup = 0;
const userNameCache = new Map<string, { name: string; expiry: number }>();

// GET: Retrieve invitations and active activity sessions for current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: true, invitations: [], sentInvitations: [] }, { status: 200 });
    }

    await ensureDatabaseTables();

    const myEmail = session.user.email.toLowerCase().trim();
    
    // Cached user name lookup to avoid DB roundtrips on every 800ms poll
    let myDbName = "";
    const cachedUser = userNameCache.get(myEmail);
    if (cachedUser && cachedUser.expiry > Date.now()) {
      myDbName = cachedUser.name;
    } else {
      const dbSender = await prisma.user.findUnique({
        where: { email: myEmail },
        select: { name: true }
      });
      myDbName = dbSender?.name?.toLowerCase().trim() || "";
      userNameCache.set(myEmail, { name: myDbName, expiry: Date.now() + 120000 });
    }

    const mySessionName = session.user.name?.toLowerCase().trim() || "";
    const myEmailPrefix = myEmail.split("@")[0];

    const { searchParams } = new URL(req.url);
    const queryUsername = searchParams.get("username")?.toLowerCase().trim() || "";

    const myNames = Array.from(new Set([myDbName, mySessionName, queryUsername, myEmailPrefix].filter(Boolean)));

    // Auto-expire active or accepted invitations older than 30 minutes (throttled to once every 2 minutes, non-blocking)
    if (Date.now() - lastExpiredCleanup > 120000) {
      lastExpiredCleanup = Date.now();
      prisma.$executeRawUnsafe(`
        UPDATE "Invitations"
        SET "status" = 'expired', "updatedAt" = NOW()
        WHERE "status" IN ('active', 'accepted') AND "updatedAt" < NOW() - INTERVAL '30 minutes';
      `).catch(err => console.error("Auto-expire cleanup error:", err));
    }

    // Consolidated single SELECT query returning all relevant invitations for current user
    const allRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Invitations" 
       WHERE (
         LOWER("senderEmail") = $1 OR LOWER("senderName") = ANY($2::text[])
         OR 
         LOWER("receiverEmail") = $1 OR LOWER("receiverName") = ANY($2::text[])
       )
       ORDER BY "createdAt" DESC LIMIT 60;`,
      myEmail,
      myNames
    );

    const isReceiver = (r: any) => {
      const recEmail = r.receiverEmail?.toLowerCase()?.trim();
      const recName = r.receiverName?.toLowerCase()?.trim();
      return recEmail === myEmail || (recName && myNames.includes(recName));
    };

    const isSender = (r: any) => {
      const sndEmail = r.senderEmail?.toLowerCase()?.trim();
      const sndName = r.senderName?.toLowerCase()?.trim();
      return sndEmail === myEmail || (sndName && myNames.includes(sndName));
    };

    const invitations = allRows.filter(isReceiver).map((r, idx) => ({
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
      activity: (r.type === 'activity' || r.type === 'photobooth') ? r.targetName : undefined,
      channel: r.type === 'channel_invite' ? r.targetName : undefined,
      groupName: r.type === 'group_invite' ? r.targetName : undefined,
      groupId: r.groupId,
      channelId: r.channelId,
      status: r.status,
      time: formatRelativeTime(new Date(r.createdAt)),
      read: false,
      createdAt: r.createdAt
    }));

    const sentInvitations = allRows.filter(isSender).map((r, idx) => ({
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

    // Active activity rows sorted by latest updatedAt
    const activeActivityRows = allRows
      .filter(r => r.status === 'active' || r.status === 'accepted')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    const formatSession = (row: any) => {
      if (!row) return null;
      const isHost = (
        row.senderEmail?.toLowerCase() === myEmail ||
        myNames.includes(row.senderName?.toLowerCase())
      );

      // If the session is only 'active' (not 'accepted'), only the host is in the room.
      // For the guest, it is merely a pending invitation, not an active joined session!
      if (!isHost && row.status === 'active') {
        return null;
      }

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
    return NextResponse.json({ success: false, invitations: [], sentInvitations: [], error: error.message || String(error) }, { status: 500 });
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
    const { receiverName, receiverEmail, senderName: clientSenderName, type = 'activity', targetName, groupId, channelId } = body;

    if (!receiverName && !receiverEmail) {
      return NextResponse.json({ message: "Receiver is required" }, { status: 400 });
    }

    if (!targetName) {
      return NextResponse.json({ message: "Target name is required" }, { status: 400 });
    }

    await ensureDatabaseTables();

    const senderEmail = session.user.email.toLowerCase().trim();
    const dbSender = await prisma.user.findUnique({
      where: { email: senderEmail },
      select: { name: true, image: true }
    });
    const senderName = clientSenderName?.trim() || dbSender?.name?.trim() || session.user.name?.trim() || senderEmail.split('@')[0];
    const senderImage = dbSender?.image || session.user.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${senderName}&backgroundColor=A577FF`;

    // Attempt to resolve receiver email if not supplied
    let finalReceiverEmail = receiverEmail?.toLowerCase().trim() || '';
    let finalReceiverName = receiverName?.trim() || '';

    if (!finalReceiverEmail && finalReceiverName) {
      const dbRecipient = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: finalReceiverName, mode: "insensitive" } },
            { email: { equals: finalReceiverName, mode: "insensitive" } }
          ]
        },
        select: { email: true, name: true }
      });
      if (dbRecipient?.email) {
        finalReceiverEmail = dbRecipient.email.toLowerCase().trim();
        if (!finalReceiverName && dbRecipient.name) finalReceiverName = dbRecipient.name;
      }
    }

    // Expire any existing active or accepted invitations involving the sender or receiver for the same activity
    const senderNamesList = Array.from(new Set([senderName.toLowerCase(), senderEmail.split('@')[0], session.user.name?.toLowerCase().trim()].filter(Boolean))) as string[];
    await prisma.$executeRawUnsafe(
      `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
       WHERE (
           LOWER("targetName") = LOWER($1)
           OR LOWER("type") = LOWER($1)
           OR LOWER("targetName") = LOWER($2)
           OR LOWER("type") = LOWER($2)
         )
         AND (
           LOWER("senderEmail") = $3 OR LOWER("senderName") = ANY($4::text[])
           OR LOWER("receiverEmail") = $3 OR LOWER("receiverName") = ANY($4::text[])
           OR (LOWER("receiverName") = $5 OR (LOWER("receiverEmail") = $6 AND $6 != ''))
         )
         AND "status" IN ('active', 'accepted');`,
      type,
      targetName,
      senderEmail,
      senderNamesList,
      finalReceiverName.toLowerCase(),
      finalReceiverEmail
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
    return NextResponse.json({ message: "Failed to create invitation", error: error.message || String(error) }, { status: 500 });
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
    const { invitationId, type, targetName, status, action, partnerName, senderName: clientSenderName } = body;

    await ensureDatabaseTables();

    const userEmail = session.user.email.toLowerCase().trim();
    const dbSender = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { name: true }
    });
    const myDbName = dbSender?.name?.toLowerCase().trim() || "";
    const mySessionName = session.user.name?.toLowerCase().trim() || "";
    const clientName = clientSenderName?.toLowerCase().trim() || "";
    const userEmailPrefix = userEmail.split("@")[0];

    const myNames = Array.from(new Set([myDbName, mySessionName, clientName, userEmailPrefix].filter(Boolean)));
    const target = (targetName || body.targetName || '').toLowerCase().trim();
    const partner = (partnerName || body.partnerName || body.senderName || '').toLowerCase().trim();

    // 1. Participant Joins / Accepts
    if (action === 'join' || status === 'accepted') {
      if (invitationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() WHERE "id" = $1;`,
          invitationId
        );
      }

      if (partner) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW()
           WHERE (
             (
               (LOWER("senderName") = ANY($1::text[]) OR LOWER("senderEmail") = $2)
               AND
               (LOWER("receiverName") = $3 OR LOWER("receiverEmail") = $3)
             )
             OR
             (
               (LOWER("receiverName") = ANY($1::text[]) OR LOWER("receiverEmail") = $2)
               AND
               (LOWER("senderName") = $3 OR LOWER("senderEmail") = $3)
             )
           )
           AND "status" IN ('active', 'accepted')
           ${target ? `AND (LOWER("targetName") = '${target}' OR LOWER("type") = '${target}')` : ''};`,
          myNames,
          userEmail,
          partner
        );
      } else if (!invitationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'accepted', "updatedAt" = NOW() 
           WHERE (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = ANY($2::text[]))
             AND "type" = COALESCE($3, 'activity')
             AND "status" = 'active';`,
          userEmail,
          myNames,
          type || 'activity'
        );
      }
      return NextResponse.json({ success: true, message: "Invitation joined/accepted" }, { status: 200 });
    }

    // 2. Participant Leaves (action === 'leave' or status === 'leave')
    if (action === 'leave' || status === 'leave') {
      const channelId = body.channelId;
      
      // Specifically handle Voice Room / Channel invitations
      if (type === 'channel_invite' || channelId) {
        // If leaving user sent invitations, expire them
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
           WHERE "status" IN ('active', 'accepted')
             AND (LOWER("senderEmail") = $1 OR LOWER("senderName") = ANY($2::text[]))
             AND ("type" = 'channel_invite' ${channelId ? `OR "channelId" = '${channelId}'` : ''} ${target ? `OR LOWER("targetName") = '${target}'` : ''});`,
          userEmail,
          myNames
        );

        // If leaving user was guest, revert their accepted invite back to 'active' so they can re-join anytime
        await prisma.$executeRawUnsafe(
          `UPDATE "Invitations" SET "status" = 'active', "updatedAt" = NOW()
           WHERE "status" = 'accepted'
             AND (LOWER("receiverEmail") = $1 OR LOWER("receiverName") = ANY($2::text[]))
             AND ("type" = 'channel_invite' ${channelId ? `OR "channelId" = '${channelId}'` : ''} ${target ? `OR LOWER("targetName") = '${target}'` : ''});`,
          userEmail,
          myNames
        );

        return NextResponse.json({ success: true, message: "Left channel session" }, { status: 200 });
      }

      // Default activity handling (Listening Together, Watch Together, Photobooth)
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "Invitations"
         WHERE "status" IN ('active', 'accepted')
           AND (
             LOWER("senderEmail") = $1 OR LOWER("senderName") = ANY($2::text[])
             OR
             LOWER("receiverEmail") = $1 OR LOWER("receiverName") = ANY($2::text[])
           )
           ${partner ? `AND (LOWER("senderName") = '${partner}' OR LOWER("receiverName") = '${partner}')` : ''}
           ${target ? `AND (LOWER("targetName") = '${target}' OR LOWER("type") = '${target}')` : ''}
         ORDER BY "updatedAt" DESC LIMIT 1;`,
        userEmail,
        myNames
      );

      if (rows.length > 0) {
        const inv = rows[0];
        const isHost = (
          inv.senderEmail?.toLowerCase() === userEmail ||
          myNames.includes(inv.senderName?.toLowerCase())
        );
        
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
    } else if (partner) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
         WHERE (
           (
             (LOWER("senderName") = ANY($1::text[]) OR LOWER("senderEmail") = $2)
             AND
             (LOWER("receiverName") = $3 OR LOWER("receiverEmail") = $3)
           )
           OR
           (
             (LOWER("receiverName") = ANY($1::text[]) OR LOWER("receiverEmail") = $2)
             AND
             (LOWER("senderName") = $3 OR LOWER("senderEmail") = $3)
           )
         )
         AND "status" IN ('active', 'accepted')
         ${target ? `AND (LOWER("targetName") = '${target}' OR LOWER("type") = '${target}')` : `AND "type" = COALESCE($4, 'activity')`};`,
        myNames,
        userEmail,
        partner,
        type || 'activity'
      );
    } else if (type) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Invitations" SET "status" = 'expired', "updatedAt" = NOW()
         WHERE (LOWER("senderEmail") = $1 OR LOWER("senderName") = ANY($2::text[]))
           AND "type" = $3
           AND "status" IN ('active', 'accepted');`,
        userEmail,
        myNames,
        type
      );
    }

    return NextResponse.json({ success: true, message: `Invitations marked as expired` }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Invitations error:", error);
    return NextResponse.json({ message: "Failed to update invitations", error: error.message || String(error) }, { status: 500 });
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
