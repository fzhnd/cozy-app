import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

import { ensureDatabaseTables } from "@/lib/dbInit";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { name, image } = await req.json();

    if (!name) {
      return NextResponse.json({ message: "Username cannot be empty" }, { status: 400 });
    }

    await ensureDatabaseTables();

    const email = session.user.email!.toLowerCase().trim();

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name,
        image,
      },
    });

    // Also update any friendships records with new name and avatar
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Friendships" SET "user1Name" = $1, "user1Image" = COALESCE($2, "user1Image"), "updatedAt" = NOW() WHERE LOWER("user1Email") = $3;`,
        name,
        image,
        email
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "Friendships" SET "user2Name" = $1, "user2Image" = COALESCE($2, "user2Image"), "updatedAt" = NOW() WHERE LOWER("user2Email") = $3;`,
        name,
        image,
        email
      );
    } catch (e) {}

    return NextResponse.json({ message: "Profile updated successfully", user: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ message: "An error occurred while updating profile", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    // Delete user from database based on authenticated email
    await prisma.user.delete({
      where: { email: session.user.email },
    });

    return NextResponse.json({ message: "Account deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Account Error:", error);
    return NextResponse.json({ message: "An error occurred while deleting account", error: error.message }, { status: 500 });
  }
}
