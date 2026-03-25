-- Better Auth OIDC provider tables
CREATE TABLE "OidcApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "metadata" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "redirectUrls" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authenticationScheme" TEXT NOT NULL DEFAULT 'client_secret_basic',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "OidcApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OidcAccessToken" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "OidcAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OidcConsent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OidcApplication_clientId_key" ON "OidcApplication"("clientId");
CREATE INDEX "OidcApplication_userId_idx" ON "OidcApplication"("userId");

CREATE UNIQUE INDEX "OidcAccessToken_accessToken_key" ON "OidcAccessToken"("accessToken");
CREATE UNIQUE INDEX "OidcAccessToken_refreshToken_key" ON "OidcAccessToken"("refreshToken");
CREATE INDEX "OidcAccessToken_clientId_idx" ON "OidcAccessToken"("clientId");
CREATE INDEX "OidcAccessToken_userId_idx" ON "OidcAccessToken"("userId");
CREATE INDEX "OidcAccessToken_accessTokenExpiresAt_idx" ON "OidcAccessToken"("accessTokenExpiresAt");
CREATE INDEX "OidcAccessToken_refreshTokenExpiresAt_idx" ON "OidcAccessToken"("refreshTokenExpiresAt");

CREATE INDEX "OidcConsent_clientId_idx" ON "OidcConsent"("clientId");
CREATE INDEX "OidcConsent_userId_idx" ON "OidcConsent"("userId");
CREATE UNIQUE INDEX "OidcConsent_clientId_userId_key" ON "OidcConsent"("clientId", "userId");

ALTER TABLE "OidcApplication"
ADD CONSTRAINT "OidcApplication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OidcAccessToken"
ADD CONSTRAINT "OidcAccessToken_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "OidcApplication"("clientId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OidcAccessToken"
ADD CONSTRAINT "OidcAccessToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OidcConsent"
ADD CONSTRAINT "OidcConsent_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "OidcApplication"("clientId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OidcConsent"
ADD CONSTRAINT "OidcConsent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy OAuth clients into OIDC applications.
-- Public clients are migrated as enabled; confidential clients are migrated
-- as disabled because legacy hashed secrets cannot be recovered.
INSERT INTO "OidcApplication" (
    "id",
    "name",
    "metadata",
    "clientId",
    "clientSecret",
    "redirectUrls",
    "type",
    "authenticationScheme",
    "disabled",
    "createdAt",
    "updatedAt",
    "userId"
)
SELECT
    "id",
    "name",
    json_build_object(
        'migratedFrom', 'OAuthClient',
        'legacyScopes', "scopes",
        'legacyGrantTypes', "grantTypes",
        'migrationNote',
        CASE
            WHEN "tokenEndpointAuthMethod" = 'none'
                THEN 'Public client migrated automatically'
            ELSE 'Confidential client secret cannot be migrated; recreate this client in /admin/oauth'
        END
    )::text,
    "clientId",
    CASE
        WHEN "tokenEndpointAuthMethod" = 'none'
            THEN md5("clientId")
        ELSE NULL
    END,
    array_to_string("redirectUris", ','),
    CASE
        WHEN "tokenEndpointAuthMethod" = 'none'
            THEN 'public'
        ELSE 'web'
    END,
    COALESCE(NULLIF("tokenEndpointAuthMethod", ''), 'client_secret_basic'),
    CASE
        WHEN "tokenEndpointAuthMethod" = 'none'
            THEN false
        ELSE true
    END,
    "createdAt",
    "updatedAt",
    NULL
FROM "OAuthClient"
ON CONFLICT ("clientId") DO NOTHING;
