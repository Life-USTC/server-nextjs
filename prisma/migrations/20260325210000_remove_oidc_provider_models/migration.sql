-- DropForeignKey
ALTER TABLE "OidcAccessToken" DROP CONSTRAINT "OidcAccessToken_clientId_fkey";

-- DropForeignKey
ALTER TABLE "OidcAccessToken" DROP CONSTRAINT "OidcAccessToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "OidcApplication" DROP CONSTRAINT "OidcApplication_userId_fkey";

-- DropForeignKey
ALTER TABLE "OidcConsent" DROP CONSTRAINT "OidcConsent_clientId_fkey";

-- DropForeignKey
ALTER TABLE "OidcConsent" DROP CONSTRAINT "OidcConsent_userId_fkey";

-- DropTable
DROP TABLE "OidcAccessToken";

-- DropTable
DROP TABLE "OidcApplication";

-- DropTable
DROP TABLE "OidcConsent";
