import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Ensure DirectMessages table exists in Supabase PostgreSQL
async function ensureDirectMessagesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DirectMessages" (
      "id" TEXT PRIMARY KEY,
      "senderEmail" TEXT NOT NULL,
      "senderName" TEXT NOT NULL,
      "senderImage" TEXT,
      "receiverEmail" TEXT NOT NULL,
      "receiverName" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "type" TEXT DEFAULT 'text',
      "audioUrl" TEXT,
      "duration" INTEGER,
      "time" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
    ALTER TABLE IF EXISTS "DirectMessages" ENABLE ROW LEVEL SECURITY;
  `);
}

// GET: Fetch direct messages between current user and a target contact
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const withUser = searchParams.get("with")?.trim().toLowerCase();

    if (!withUser) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    await ensureDirectMessagesTable();

    const myEmail = session.user.email.toLowerCase().trim();
    const myName = (session.user.name || myEmail.split("@")[0]).toLowerCase().trim();

    // Query messages exchanged between me and withUser (by email or name)
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DirectMessages" WHERE 
        ((LOWER("senderEmail") = $1 OR LOWER("senderName") = $2) AND (LOWER("receiverEmail") = $3 OR LOWER("receiverName") = $3)) OR
        ((LOWER("receiverEmail") = $1 OR LOWER("receiverName") = $2) AND (LOWER("senderEmail") = $3 OR LOWER("senderName") = $3))
       ORDER BY "createdAt" ASC;`,
      myEmail,
      myName,
      withUser
    );

    const messages = rows.map((r, index) => {
      const isSelf = r.senderEmail.toLowerCase() === myEmail || r.senderName.toLowerCase() === myName;
      return {
        id: r.id || index + 1,
        text: r.text,
        type: r.type || 'text',
        audioUrl: r.audioUrl,
        duration: r.duration,
        time: r.time,
        isSelf,
        sender: r.senderName
      };
    });

    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error: any) {
    console.error("GET DirectMessages error:", error);
    return NextResponse.json({ messages: [], error: error.message }, { status: 500 });
  }
}

// POST: Send a new direct message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverName, receiverEmail, text, type = 'text', audioUrl, duration } = body;

    if (!receiverName && !receiverEmail) {
      return NextResponse.json({ message: "Receiver is required" }, { status: 400 });
    }

    if (!text && !audioUrl) {
      return NextResponse.json({ message: "Message content cannot be empty" }, { status: 400 });
    }

    await ensureDirectMessagesTable();

    const senderEmail = session.user.email.toLowerCase().trim();
    const senderName = session.user.name?.trim() || senderEmail.split('@')[0];
    const senderImage = session.user.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${senderName}&backgroundColor=A577FF`;

    // Try finding receiver email if only name is provided
    let finalReceiverEmail = receiverEmail?.toLowerCase() || '';
    let finalReceiverName = receiverName || '';

    if (!finalReceiverEmail && finalReceiverName) {
      const dbUser = await prisma.user.findFirst({
        where: { name: { equals: finalReceiverName, mode: "insensitive" } }
      });
      if (dbUser?.email) finalReceiverEmail = dbUser.email.toLowerCase();
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "DirectMessages" 
        ("id", "senderEmail", "senderName", "senderImage", "receiverEmail", "receiverName", "text", "type", "audioUrl", "duration", "time", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW());`,
      msgId,
      senderEmail,
      senderName,
      senderImage,
      finalReceiverEmail,
      finalReceiverName,
      text || 'Voice Message',
      type,
      audioUrl || null,
      duration || null,
      timeStr
    );

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        text: text || 'Voice Message',
        type,
        audioUrl,
        duration,
        time: timeStr,
        isSelf: true,
        sender: senderName
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST DirectMessages error:", error);
    return NextResponse.json({ message: "Failed to send message", error: error.message }, { status: 500 });
  }
}
