import { prisma } from "@/lib/prisma";

const globalForDb = globalThis as unknown as {
  __dbTablesInitialized?: boolean;
  __dbInitPromise?: Promise<void> | null;
};

export async function ensureDatabaseTables() {
  if (globalForDb.__dbTablesInitialized) return;

  if (globalForDb.__dbInitPromise) {
    return globalForDb.__dbInitPromise;
  }

  globalForDb.__dbInitPromise = (async () => {
    try {
      // 1. Friendships table
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
      `).catch(err => {
        // Table might already exist or DDL restricted; log warning only
        console.warn("Friendships table init notice:", err?.message || err);
      });

      // 2. Invitations table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Invitations" (
          "id" TEXT PRIMARY KEY,
          "senderEmail" TEXT NOT NULL,
          "senderName" TEXT NOT NULL,
          "senderImage" TEXT,
          "receiverEmail" TEXT,
          "receiverName" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "targetName" TEXT NOT NULL,
          "groupId" TEXT,
          "channelId" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `).catch(err => {
        console.warn("Invitations table init notice:", err?.message || err);
      });

      // 3. UserSyncData table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserSyncData" (
          "userId" TEXT PRIMARY KEY,
          "email" TEXT NOT NULL,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `).catch(err => {
        console.warn("UserSyncData table init notice:", err?.message || err);
      });

      // 4. PublicChannels table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PublicChannels" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "icon" TEXT DEFAULT '🔊',
          "groupId" TEXT NOT NULL,
          "groupName" TEXT NOT NULL,
          "groupIcon" TEXT DEFAULT '#1',
          "creatorName" TEXT NOT NULL,
          "creatorEmail" TEXT NOT NULL,
          "activeUsers" INTEGER DEFAULT 0,
          "isPublic" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `).catch(err => {
        console.warn("PublicChannels table init notice:", err?.message || err);
      });

      globalForDb.__dbTablesInitialized = true;
    } catch (err) {
      console.error("Database initialization error:", err);
    } finally {
      globalForDb.__dbInitPromise = null;
    }
  })();

  return globalForDb.__dbInitPromise;
}
