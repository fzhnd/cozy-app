import { prisma } from "@/lib/prisma";

let isDbInitialized = false;

export async function ensureDatabaseTables() {
  if (isDbInitialized) return;

  try {
    // 1. Ensure Friendships table exists
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
    `);

    // 2. Ensure Invitations table exists
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
    `);

    // 3. Ensure UserSyncData table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSyncData" (
        "userId" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "data" JSONB NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Enable RLS and setup permissive application policy + revoke public anon/authenticated PostgREST access
    await prisma.$executeRawUnsafe(`
      DO $$ 
      DECLARE
        t text;
        tbls text[] := ARRAY['User', 'Account', 'Session', 'VerificationToken', 'Friendships', 'Invitations', 'UserSyncData'];
      BEGIN 
        FOREACH t IN ARRAY tbls LOOP
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Enable RLS to satisfy Supabase security advisor
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
            
            -- Ensure full access policy for the app database connection
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'allow_app_full_access'
            ) THEN
              EXECUTE format('CREATE POLICY "allow_app_full_access" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
            END IF;

            -- Revoke public PostgREST API access from anon and authenticated roles
            EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated;', t);
          END IF;
        END LOOP;
      END $$;
    `);

    isDbInitialized = true;
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}
