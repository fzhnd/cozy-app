import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Ensure synchronization table exists in PostgreSQL
async function ensureSyncTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserSyncData" (
      "userId" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

// GET: Retrieve user sync data across devices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    await ensureSyncTable();

    const userEmail = session.user.email.toLowerCase();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "data" FROM "UserSyncData" WHERE LOWER("email") = $1 LIMIT 1;`,
      userEmail
    );

    if (rows && rows.length > 0) {
      return NextResponse.json({ success: true, data: rows[0].data }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch (error: any) {
    console.error("GET User Sync Error:", error);
    return NextResponse.json({ message: "Failed to fetch user sync data", error: error.message }, { status: 500 });
  }
}

// POST: Save user sync data to database
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ message: "Data payload is required" }, { status: 400 });
    }

    await ensureSyncTable();

    const userEmail = session.user.email.toLowerCase();
    const userId = (session.user as any).id || userEmail;
    const jsonString = JSON.stringify(data);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "UserSyncData" ("userId", "email", "data", "updatedAt")
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT ("userId")
      DO UPDATE SET "data" = "UserSyncData"."data" || EXCLUDED."data", "email" = EXCLUDED."email", "updatedAt" = NOW();
      `,
      userId,
      userEmail,
      jsonString
    );

    return NextResponse.json({ success: true, message: "User data synced successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("POST User Sync Error:", error);
    return NextResponse.json({ message: "Failed to save user sync data", error: error.message }, { status: 500 });
  }
}
