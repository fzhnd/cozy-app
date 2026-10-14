import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseTables } from "@/lib/dbInit";

const escapeSql = (str: string) => (str || '').replace(/'/g, "''");
const toInSql = (arr: string[]) => {
  const filtered = arr.filter(Boolean).map(s => `'${escapeSql(s.toLowerCase().trim())}'`);
  return filtered.length > 0 ? filtered.join(", ") : "''";
};

// GET: Fetch accepted friends and pending friend requests for current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: true, friends: [], pendingRequests: [], sentRequests: [] }, { status: 200 });
    }

    await ensureDatabaseTables();

    const myEmail = session.user.email.toLowerCase().trim();
    const dbSender = await prisma.user.findUnique({
      where: { email: myEmail },
      select: { name: true }
    });
    const myDbName = dbSender?.name?.toLowerCase().trim() || "";
    const mySessionName = session.user.name?.toLowerCase().trim() || "";
    const myEmailPrefix = myEmail.split("@")[0];

    const { searchParams } = new URL(req.url);
    const paramUsername = searchParams.get("username")?.toLowerCase().trim() || "";

    const myNames = Array.from(new Set([myDbName, mySessionName, paramUsername, myEmailPrefix].filter(Boolean)));
    const myNamesSql = toInSql(myNames);
    const safeEmail = escapeSql(myEmail);

    // 1. Pending requests sent TO me (waiting for my approval)
    const pendingRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" 
       WHERE (LOWER("user2Email") = '${safeEmail}' OR LOWER("user2Name") IN (${myNamesSql})) 
         AND "status" = 'pending' 
       ORDER BY "createdAt" DESC;`
    );

    // 2. Pending requests sent BY me
    const sentRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" 
       WHERE (LOWER("user1Email") = '${safeEmail}' OR LOWER("user1Name") IN (${myNamesSql})) 
         AND "status" = 'pending' 
       ORDER BY "createdAt" DESC;`
    );

    // 3. Accepted friendships (both directions)
    const acceptedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" 
       WHERE "status" = 'accepted' 
         AND (
           LOWER("user1Email") = '${safeEmail}' OR LOWER("user1Name") IN (${myNamesSql})
           OR
           LOWER("user2Email") = '${safeEmail}' OR LOWER("user2Name") IN (${myNamesSql})
         ) 
       ORDER BY "updatedAt" DESC;`
    );

    // Batch resolve latest user profile images from prisma.user for all participants
    const allParticipantEmails = new Set<string>();
    const allParticipantNames = new Set<string>();

    [...pendingRows, ...acceptedRows].forEach(r => {
      if (r.user1Email) allParticipantEmails.add(r.user1Email.toLowerCase().trim());
      if (r.user2Email) allParticipantEmails.add(r.user2Email.toLowerCase().trim());
      if (r.user1Name) allParticipantNames.add(r.user1Name.toLowerCase().trim());
      if (r.user2Name) allParticipantNames.add(r.user2Name.toLowerCase().trim());
    });

    const userImageMap = new Map<string, string>();
    if (allParticipantEmails.size > 0 || allParticipantNames.size > 0) {
      const dbUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: Array.from(allParticipantEmails) } },
            { name: { in: Array.from(allParticipantNames), mode: 'insensitive' } }
          ]
        },
        select: { email: true, name: true, image: true }
      });

      dbUsers.forEach((u: any) => {
        if (u.image) {
          if (u.email) userImageMap.set(u.email.toLowerCase().trim(), u.image);
          if (u.name) userImageMap.set(u.name.toLowerCase().trim(), u.image);
        }
      });
    }

    const pendingRequests = pendingRows.map(r => {
      const resolvedAvatar = (r.user1Email && userImageMap.get(r.user1Email.toLowerCase().trim()))
        || (r.user1Name && userImageMap.get(r.user1Name.toLowerCase().trim()))
        || r.user1Image
        || `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.user1Name}&backgroundColor=F9EBD8`;

      return {
        id: r.id,
        name: r.user1Name,
        seed: r.user1Name,
        email: r.user1Email,
        avatar: resolvedAvatar,
        color: 'F9EBD8',
        createdAt: r.createdAt
      };
    });

    const sentRequests = sentRows.map(r => ({
      id: r.id,
      targetName: r.user2Name,
      targetEmail: r.user2Email,
      createdAt: r.createdAt
    }));

    const friends = acceptedRows.map(r => {
      const isUser1Me = (
        r.user1Email?.toLowerCase() === myEmail ||
        myNames.includes(r.user1Name?.toLowerCase())
      );
      const friendName = isUser1Me ? r.user2Name : r.user1Name;
      const friendEmail = isUser1Me ? r.user2Email : r.user1Email;
      const friendSavedImage = isUser1Me ? r.user2Image : r.user1Image;

      const resolvedAvatar = (friendEmail && userImageMap.get(friendEmail.toLowerCase().trim()))
        || (friendName && userImageMap.get(friendName.toLowerCase().trim()))
        || friendSavedImage
        || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friendName}&backgroundColor=A577FF`;

      return {
        id: r.id,
        name: friendName,
        seed: friendName,
        email: friendEmail,
        avatar: resolvedAvatar,
        color: 'A577FF',
        status: 'bg-green-500',
        label: 'Online',
        isRealFriend: true
      };
    });

    return NextResponse.json({
      success: true,
      friends,
      pendingRequests,
      sentRequests
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET Friends error:", error);
    return NextResponse.json({ success: false, friends: [], pendingRequests: [], sentRequests: [], message: "Failed to load friends", error: error.message }, { status: 500 });
  }
}

// POST: Send a friend request to a registered user
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "You must be logged in to send friend requests." }, { status: 401 });
    }

    const { targetUsername, senderName: clientSenderName } = await req.json();
    const cleanTarget = targetUsername?.trim();

    if (!cleanTarget) {
      return NextResponse.json({ message: "Username cannot be empty." }, { status: 400 });
    }

    await ensureDatabaseTables();

    const senderEmail = session.user.email.toLowerCase().trim();
    const dbSender = await prisma.user.findUnique({
      where: { email: senderEmail },
      select: { name: true, image: true }
    });
    const senderName = clientSenderName?.trim() || dbSender?.name?.trim() || session.user.name?.trim() || senderEmail.split('@')[0];
    const senderImage = dbSender?.image || session.user.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${senderName}&backgroundColor=F9EBD8`;

    // Cannot add self
    if (cleanTarget.toLowerCase() === senderEmail || cleanTarget.toLowerCase() === senderName.toLowerCase()) {
      return NextResponse.json({ message: "You cannot send a friend request to yourself!" }, { status: 400 });
    }

    // Support mockup dummy users (pocha, leci, luna, jasper, mimi)
    const DUMMY_USERS = ['luna', 'jasper', 'mimi', 'pocha', 'leci'];
    let targetUser: { name: string; email: string; image: string | null } | null = null;

    if (DUMMY_USERS.includes(cleanTarget.toLowerCase())) {
      targetUser = {
        name: cleanTarget.toLowerCase(),
        email: `${cleanTarget.toLowerCase()}@cozy.app`,
        image: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanTarget}&backgroundColor=F9EBD8`
      };
    } else {
      // Find recipient in database
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: cleanTarget, mode: "insensitive" } },
            { email: { equals: cleanTarget, mode: "insensitive" } }
          ]
        }
      });

      if (!dbUser) {
        return NextResponse.json({ message: "Username is not registered!" }, { status: 404 });
      }

      if (dbUser.email?.toLowerCase() === senderEmail) {
        return NextResponse.json({ message: "You cannot send a friend request to yourself!" }, { status: 400 });
      }

      targetUser = {
        name: dbUser.name || cleanTarget,
        email: dbUser.email?.toLowerCase() || `${cleanTarget.toLowerCase()}@user.cozy`,
        image: dbUser.image
      };
    }

    const receiverEmail = targetUser.email.toLowerCase();
    const receiverName = targetUser.name;
    const receiverImage = targetUser.image;

    // Check if a relationship already exists (by email OR name in either direction)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE 
        (
          (LOWER("user1Email") = $1 OR LOWER("user1Name") = $2)
          AND
          (LOWER("user2Email") = $3 OR LOWER("user2Name") = $4)
        )
        OR 
        (
          (LOWER("user1Email") = $3 OR LOWER("user1Name") = $4)
          AND
          (LOWER("user2Email") = $1 OR LOWER("user2Name") = $2)
        )
       LIMIT 1;`,
      senderEmail,
      senderName.toLowerCase(),
      receiverEmail,
      receiverName.toLowerCase()
    );

    if (existing && existing.length > 0) {
      const rel = existing[0];
      if (rel.status === 'accepted') {
        return NextResponse.json({ message: `You and ${receiverName} are already friends!` }, { status: 400 });
      }

      if (rel.status === 'pending') {
        const isSentByMe = (
          rel.user1Email.toLowerCase() === senderEmail ||
          rel.user1Name.toLowerCase() === senderName.toLowerCase()
        );
        if (isSentByMe) {
          return NextResponse.json({ message: `Friend request to ${receiverName} is already pending.` }, { status: 400 });
        } else {
          // The other user already sent a request to me -> Auto accept!
          await prisma.$executeRawUnsafe(
            `UPDATE "Friendships" SET "status" = 'accepted', "updatedAt" = NOW() WHERE "id" = $1;`,
            rel.id
          );
          return NextResponse.json({
            success: true,
            message: `${receiverName} had already sent you a request! You are now friends! 🎉`
          }, { status: 200 });
        }
      }

      // If status is rejected, unfriend, or expired -> Reset to pending!
      await prisma.$executeRawUnsafe(
        `UPDATE "Friendships" 
         SET "status" = 'pending', "user1Email" = $1, "user1Name" = $2, "user1Image" = $3,
             "user2Email" = $4, "user2Name" = $5, "user2Image" = $6, "updatedAt" = NOW()
         WHERE "id" = $7;`,
        senderEmail,
        senderName,
        senderImage,
        receiverEmail,
        receiverName,
        receiverImage,
        rel.id
      );

      return NextResponse.json({
        success: true,
        message: `Friend request sent to ${receiverName}! Waiting for approval.`
      }, { status: 201 });
    }

    // Insert new pending friend request
    const newId = `fr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Friendships" ("id", "user1Email", "user1Name", "user1Image", "user2Email", "user2Name", "user2Image", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW());`,
      newId,
      senderEmail,
      senderName,
      senderImage,
      receiverEmail,
      receiverName,
      receiverImage
    );

    return NextResponse.json({
      success: true,
      message: `Friend request sent to ${receiverName}! Waiting for approval.`
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST Friend Request error:", error);
    return NextResponse.json({ message: "Failed to send friend request", error: error.message || String(error) }, { status: 500 });
  }
}

// DELETE: Unfriend
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { targetEmail, targetName } = await req.json();
    const myEmail = session.user.email.toLowerCase().trim();
    const dbSender = await prisma.user.findUnique({
      where: { email: myEmail },
      select: { name: true }
    });
    const myName = (dbSender?.name || session.user.name || myEmail.split('@')[0]).toLowerCase().trim();
    const cleanTargetEmail = (targetEmail || '').toLowerCase().trim();
    const cleanTargetName = (targetName || '').toLowerCase().trim();

    await ensureDatabaseTables();

    await prisma.$executeRawUnsafe(
      `DELETE FROM "Friendships" WHERE 
        (
          (LOWER("user1Email") = $1 OR LOWER("user1Name") = $2)
          AND
          ((LOWER("user2Email") = $3 AND $3 != '') OR (LOWER("user2Name") = $4 AND $4 != ''))
        )
        OR
        (
          (LOWER("user2Email") = $1 OR LOWER("user2Name") = $2)
          AND
          ((LOWER("user1Email") = $3 AND $3 != '') OR (LOWER("user1Name") = $4 AND $4 != ''))
        );`,
      myEmail,
      myName,
      cleanTargetEmail,
      cleanTargetName
    );

    return NextResponse.json({ success: true, message: "Friend removed successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Friend error:", error);
    return NextResponse.json({ message: "Failed to unfriend", error: error.message || String(error) }, { status: 500 });
  }
}
