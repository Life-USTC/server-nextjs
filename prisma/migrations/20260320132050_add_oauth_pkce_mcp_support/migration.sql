-- AlterTable
ALTER TABLE "OAuthAccessToken" ADD COLUMN     "resource" TEXT;

-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'client_secret_basic',
ALTER COLUMN "clientSecret" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OAuthCode" ADD COLUMN     "codeChallenge" TEXT,
ADD COLUMN     "codeChallengeMethod" TEXT,
ADD COLUMN     "resource" TEXT;
