-- User: add Better Auth required core fields.
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "email" = CASE
  WHEN "username" IS NOT NULL THEN "username" || '@users.local'
  ELSE 'user-' || "id" || '@users.local'
END
WHERE "email" IS NULL;

ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET DEFAULT '';

UPDATE "User"
SET "name" = ''
WHERE "name" IS NULL;

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Account: switch to Better Auth shape (id PK + credential password support).
ALTER TABLE "Account"
ADD COLUMN "id" TEXT,
ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "password" TEXT;

UPDATE "Account"
SET "id" = 'acc_' || md5("provider" || ':' || "providerAccountId")
WHERE "id" IS NULL;

ALTER TABLE "Account" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "type" SET DEFAULT 'oauth';

ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey";
ALTER TABLE "Account" ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"
ON "Account"("provider", "providerAccountId");

CREATE INDEX "Account_provider_idx" ON "Account"("provider");

-- Session: add id PK and request metadata fields.
ALTER TABLE "Session"
ADD COLUMN "id" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT;

UPDATE "Session"
SET "id" = 'sess_' || md5("sessionToken")
WHERE "id" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- VerificationToken: add id PK and timestamps.
ALTER TABLE "VerificationToken"
ADD COLUMN "id" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "VerificationToken"
SET "id" = 'vt_' || md5("identifier" || ':' || "token")
WHERE "id" IS NULL;

ALTER TABLE "VerificationToken" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_pkey";
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"
ON "VerificationToken"("identifier", "token");

CREATE INDEX "VerificationToken_identifier_idx" ON "VerificationToken"("identifier");
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");
