import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const cleanEmail = credentials.email.toLowerCase().trim();
          const user = await prisma.user.findFirst({
            where: { email: { equals: cleanEmail, mode: "insensitive" } }
          }) || await prisma.user.findUnique({
            where: { email: credentials.email.trim() }
          });

          if (!user || !user.password) {
            throw new Error("Email not found or registered via Google");
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error("Incorrect password. Please try again or use Reset Password.");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (err: any) {
          if (
            err.message === "Email not found or registered via Google" || 
            err.message.startsWith("Incorrect password") || 
            err.message === "Invalid password"
          ) {
            throw err;
          }
          console.error("Database auth error:", err);
          if (err?.message?.includes("DATABASE_URL")) {
            throw new Error("Database configuration error (DATABASE_URL not found). Please set DATABASE_URL in Vercel.");
          }
          throw new Error("Database connection error. Please try again later.");
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, trigger, session }) {
      if (trigger === "update" && session) {
        token.name = session.name || token.name;
        token.picture = session.image || token.picture;
      }
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { name: true, image: true }
          });
          if (dbUser) {
            if (dbUser.name) token.name = dbUser.name;
            if (dbUser.image) token.picture = dbUser.image;
          }
        } catch (e) {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.sub;
        session.user.name = token.name;
        session.user.image = token.picture as string | null | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "cozy-app-super-secret-key-prod-fallback",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
