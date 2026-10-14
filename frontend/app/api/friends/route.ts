import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Ensure Friendships table exists in Supabase PostgreSQL
async function ensureFriendshipsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Friendships" (
      "id" TEXT PRIMARY KEY,
      "user1Email" TEXT NOT NULL,
      "user1Name" TEXT NOT NULL,
      "user1Image" TEXT,
      "user2Email" TEXT NOT NULL,
      "user2Name" TEXT NOT NULL,
      "user2Image" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
    ALTER TABLE IF EXISTS "Friendships" ENABLE ROW LEVEL SECURITY;
  `);
}

// GET: Fetch accepted friends and pending friend requests for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ friends: [], pendingRequests: [], sentRequests: [] }, { status: 200 });
    }

    await ensureFriendshipsTable();

    const myEmail = session.user.email.toLowerCase().trim();

    // 1. Pending requests sent TO me (waiting for my approval)
    const pendingRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE LOWER("user2Email") = $1 AND "status" = 'pending' ORDER BY "createdAt" DESC;`,
      myEmail
    );

    const pendingRequests = pendingRows.map(r => ({
      id: r.id,
      name: r.user1Name,
      seed: r.user1Name,
      email: r.user1Email,
      avatar: r.user1Image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.user1Name}&backgroundColor=F9EBD8`,
      color: 'F9EBD8',
      createdAt: r.createdAt
    }));

    // 2. Pending requests sent BY me
    const sentRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE LOWER("user1Email") = $1 AND "status" = 'pending' ORDER BY "createdAt" DESC;`,
      myEmail
    );

    const sentRequests = sentRows.map(r => ({
      id: r.id,
      targetName: r.user2Name,
      targetEmail: r.user2Email,
      createdAt: r.createdAt
    }));

    // 3. Accepted friendships (both directions)
    const acceptedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE "status" = 'accepted' AND (LOWER("user1Email") = $1 OR LOWER("user2Email") = $1) ORDER BY "updatedAt" DESC;`,
      myEmail
    );

    const friends = acceptedRows.map(r => {
      const isUser1Me = r.user1Email.toLowerCase() === myEmail;
      const friendName = isUser1Me ? r.user2Name : r.user1Name;
      const friendEmail = isUser1Me ? r.user2Email : r.user1Email;
      const friendImage = isUser1Me ? r.user2Image : r.user1Image;

      return {
        id: r.id,
        name: friendName,
        seed: friendName,
        email: friendEmail,
        avatar: friendImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friendName}&backgroundColor=A577FF`,
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
    return NextResponse.json({ message: "Failed to load friends", error: error.message }, { status: 500 });
  }
}

// POST: Send a friend request to a registered user
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "You must be logged in to send friend requests." }, { status: 401 });
    }

    const { targetUsername } = await req.json();
    const cleanTarget = targetUsername?.trim();

    if (!cleanTarget) {
      return NextResponse.json({ message: "Username cannot be empty." }, { status: 400 });
    }

    await ensureFriendshipsTable();

    const senderEmail = session.user.email.toLowerCase().trim();
    const senderName = session.user.name?.trim() || senderEmail.split('@')[0];
    const senderImage = session.user.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${senderName}&backgroundColor=F9EBD8`;

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
        email: dbUser.email?.toLowerCase() || '',
        image: dbUser.image
      };
    }

    const receiverEmail = targetUser.email.toLowerCase();
    const receiverName = targetUser.name;
    const receiverImage = targetUser.image;

    // Check if a relationship already exists
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE 
        (LOWER("user1Email") = $1 AND LOWER("user2Email") = $2) OR 
        (LOWER("user1Email") = $2 AND LOWER("user2Email") = $1)
       LIMIT 1;`,
      senderEmail,
      receiverEmail
    );

    if (existing && existing.length > 0) {
      const rel = existing[0];
      if (rel.status === 'accepted') {
        return NextResponse.json({ message: `You and ${receiverName} are already friends!` }, { status: 400 });
      }

      if (rel.status === 'pending') {
        if (rel.user1Email.toLowerCase() === senderEmail) {
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
    return NextResponse.json({ message: "Failed to send friend request", error: error.message }, { status: 500 });
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

    await ensureFriendshipsTable();

    await prisma.$executeRawUnsafe(
      `DELETE FROM "Friendships" WHERE 
        (LOWER("user1Email") = $1 AND (LOWER("user2Email") = $2 OR LOWER("user2Name") = $3)) OR
        (LOWER("user2Email") = $1 AND (LOWER("user1Email") = $2 OR LOWER("user1Name") = $3));`,
      myEmail,
      (targetEmail || '').toLowerCase(),
      (targetName || '').toLowerCase()
    );

    return NextResponse.json({ success: true, message: "Friend removed successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Friend error:", error);
    return NextResponse.json({ message: "Failed to unfriend", error: error.message }, { status: 500 });
  }
}
