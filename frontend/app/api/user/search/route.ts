import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseTables } from "@/lib/dbInit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json(
        { found: false, message: "Query is required" },
        { status: 400 }
      );
    }

    await ensureDatabaseTables();

    // 1. Mockup users support (luna, jasper, mimi, pocha, leci)
    const DUMMY_USERS = ["luna", "jasper", "mimi", "pocha", "leci"];
    if (DUMMY_USERS.includes(query.toLowerCase())) {
      return NextResponse.json({
        found: true,
        user: {
          name: query.toLowerCase(),
          email: `${query.toLowerCase()}@cozy.app`,
          image: `https://api.dicebear.com/7.x/adventurer/svg?seed=${query}&backgroundColor=F9EBD8`,
        },
      });
    }

    // 2. Query real database (Supabase PostgreSQL via Prisma)
    // Matches by username OR email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: query, mode: "insensitive" } },
          { email: { equals: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { found: false, message: "Username is not registered!" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      user,
    });
  } catch (error: any) {
    console.error("User search API error:", error);
    return NextResponse.json(
      { found: false, message: "Failed to search user." },
      { status: 500 }
    );
  }
}
