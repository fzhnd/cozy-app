import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseTables } from "@/lib/dbInit";

// GET: Retrieve all community public channels across all users
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "PublicChannels" WHERE "isPublic" = true ORDER BY "updatedAt" DESC LIMIT 50;`
    ).catch(async (err: any) => {
      // If table doesn't exist yet, lazily initialize and retry once
      if (err?.message?.includes("does not exist") || err?.code === "42P01") {
        await ensureDatabaseTables();
        return await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "PublicChannels" WHERE "isPublic" = true ORDER BY "updatedAt" DESC LIMIT 50;`
        ).catch(() => []);
      }
      console.warn("PublicChannels query warning:", err?.message || err);
      return [];
    });

    const channels = (rows || []).map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon || '🔊',
      isPublic: true,
      activeUsers: r.activeUsers || 0,
      group: {
        id: r.groupId,
        name: r.groupName,
        icon: r.groupIcon || '#1',
        creatorName: r.creatorName
      }
    }));

    return NextResponse.json({ success: true, channels }, { status: 200 });
  } catch (error: any) {
    console.error("GET PublicChannels error:", error);
    return NextResponse.json({ success: true, channels: [], error: error.message }, { status: 200 });
  }
}

// POST: Register or update a public channel
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { channel, group } = await req.json();

    if (!channel?.id || !channel?.name || !group?.id) {
      return NextResponse.json({ message: "Channel and group details are required" }, { status: 400 });
    }

    await ensureDatabaseTables();

    const creatorEmail = session.user.email.toLowerCase().trim();
    const creatorName = session.user.name?.trim() || creatorEmail.split('@')[0];

    const isPublic = channel.isPublic !== undefined ? channel.isPublic : true;

    if (isPublic) {
      // Upsert into PublicChannels
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PublicChannels" 
          ("id", "name", "icon", "groupId", "groupName", "groupIcon", "creatorName", "creatorEmail", "activeUsers", "isPublic", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "icon" = EXCLUDED."icon",
          "groupName" = EXCLUDED."groupName",
          "groupIcon" = EXCLUDED."groupIcon",
          "isPublic" = EXCLUDED."isPublic",
          "updatedAt" = NOW();`,
        channel.id,
        channel.name,
        channel.icon || '🔊',
        group.id,
        group.name,
        group.icon || '#1',
        creatorName,
        creatorEmail,
        channel.activeUsers || 0,
        true
      );
    } else {
      // If toggled to private, remove from PublicChannels
      await prisma.$executeRawUnsafe(
        `DELETE FROM "PublicChannels" WHERE "id" = $1;`,
        channel.id
      );
    }

    return NextResponse.json({ success: true, message: "Channel synced successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("POST PublicChannels error:", error);
    return NextResponse.json({ message: "Failed to sync channel", error: error.message }, { status: 500 });
  }
}
