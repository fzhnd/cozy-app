import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Email is already registered" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default random avatar like dicebear
    const randomAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name || email}&backgroundColor=F5F7FC`;

    // Save to database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        image: randomAvatar,
      },
    });

    return NextResponse.json({ message: "Registration successful", user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json({ message: "An error occurred during registration", error: error.message }, { status: 500 });
  }
}
