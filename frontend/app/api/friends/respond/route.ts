import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return NextResponse.json({ message: "Request ID and action ('accept' or 'reject') are required." }, { status: 400 });
    }

    const myEmail = session.user.email.toLowerCase().trim();

    // Verify the request is addressed to the current logged-in user
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Friendships" WHERE "id" = $1 AND LOWER("user2Email") = $2 LIMIT 1;`,
      requestId,
      myEmail
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: "Friend request not found or not authorized." }, { status: 404 });
    }

    const requestItem = rows[0];

    if (action === 'accept') {
      // Update status to accepted
      await prisma.$executeRawUnsafe(
        `UPDATE "Friendships" SET "status" = 'accepted', "updatedAt" = NOW() WHERE "id" = $1;`,
        requestId
      );

      return NextResponse.json({
        success: true,
        message: `You and ${requestItem.user1Name} are now friends! 🎉`,
        friend: {
          id: requestItem.id,
          name: requestItem.user1Name,
          seed: requestItem.user1Name,
          email: requestItem.user1Email,
          avatar: requestItem.user1Image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${requestItem.user1Name}&backgroundColor=A577FF`,
          color: 'A577FF',
          status: 'bg-green-500',
          label: 'Online',
          isRealFriend: true
        }
      }, { status: 200 });

    } else if (action === 'reject') {
      // Remove friend request
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Friendships" WHERE "id" = $1;`,
        requestId
      );

      return NextResponse.json({
        success: true,
        message: `Friend request rejected.`
      }, { status: 200 });

    } else {
      return NextResponse.json({ message: "Invalid action." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Respond friend request error:", error);
    return NextResponse.json({ message: "Failed to respond to friend request", error: error.message }, { status: 500 });
  }
}
