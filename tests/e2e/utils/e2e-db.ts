import { execFile } from "node:child_process";
import { promisify } from "node:util";

export { getCurrentSessionUser, PLAYWRIGHT_BASE_URL } from "./e2e-db/core";

const execFileAsync = promisify(execFile);

function buildFixtureEnv() {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return env;
}

async function runDbFixture<T>(operation: string, args: unknown[] = []) {
  const { stdout } = await execFileAsync(
    "bun",
    ["run", "tests/e2e/utils/e2e-db/cli.ts", operation, JSON.stringify(args)],
    {
      cwd: process.cwd(),
      env: buildFixtureEnv(),
      maxBuffer: 1024 * 1024,
    },
  );

  return JSON.parse(stdout) as T;
}

type OAuthClientFixtureOptions = {
  name?: string;
  redirectUris?: string[];
  scopes?: string[];
  grantTypes?: string[];
  clientId?: string;
  clientSecret?: string;
  tokenEndpointAuthMethod?:
    | "client_secret_basic"
    | "client_secret_post"
    | "none";
};

type LinkedAccountFixtureOptions = {
  userId: string;
  provider: "github" | "google" | "oidc";
  providerAccountId?: string;
  email?: string;
};

type UserProfileFixture = {
  name: string;
  username: string | null;
  image: string | null;
};

type UserProfileUpdateFixture = {
  name?: string | null;
  username?: string | null;
  image?: string | null;
};

export const createOAuthClientFixture = (options?: OAuthClientFixtureOptions) =>
  runDbFixture<{
    id: string;
    clientId: string;
    name: string;
    clientSecret: string | null;
    tokenEndpointAuthMethod: string;
    redirectUris: string[];
    scopes: string[];
  }>("createOAuthClientFixture", [options]);

export const deleteOAuthClientsByName = (name: string) =>
  runDbFixture<null>("deleteOAuthClientsByName", [name]);

export const ensureLinkedAccountFixture = (
  options: LinkedAccountFixtureOptions,
) =>
  runDbFixture<{
    provider: string;
    providerAccountId: string;
    email: string;
  }>("ensureLinkedAccountFixture", [options]);

export const deleteLinkedAccountFixture = (options: {
  userId: string;
  provider: string;
}) => runDbFixture<null>("deleteLinkedAccountFixture", [options]);

export const getSeedCourseFilterFixture = (jwId: number) =>
  runDbFixture<{
    educationLevelId: number | null;
    educationLevelName: string | null;
    categoryId: number | null;
    categoryName: string | null;
    classTypeId: number | null;
    classTypeName: string | null;
  }>("getSeedCourseFilterFixture", [jwId]);

export const getSeedTeacherDepartmentFixture = (code: string) =>
  runDbFixture<{ departmentId: number | null; departmentName: string | null }>(
    "getSeedTeacherDepartmentFixture",
    [code],
  );

export const getSeedSectionSemesterFixture = (jwId: number) =>
  runDbFixture<{ semesterId: number | null; semesterName: string | null }>(
    "getSeedSectionSemesterFixture",
    [jwId],
  );

export const getUserProfileById = (userId: string) =>
  runDbFixture<UserProfileFixture>("getUserProfileById", [userId]);

export const ensureUserCalendarFeedFixture = (userId: string) =>
  runDbFixture<{ userId: string; token: string; path: string }>(
    "ensureUserCalendarFeedFixture",
    [userId],
  );

export const updateUserProfileById = (
  userId: string,
  data: UserProfileUpdateFixture,
) => runDbFixture<null>("updateUserProfileById", [userId, data]);

export const getUserSubscribedSectionIds = (userId: string) =>
  runDbFixture<number[]>("getUserSubscribedSectionIds", [userId]);

export const replaceUserSubscribedSectionIds = (
  userId: string,
  sectionIds: number[],
) =>
  runDbFixture<null>("replaceUserSubscribedSectionIds", [userId, sectionIds]);

export const createTempUsersFixture = (options: {
  prefix: string;
  count: number;
}) =>
  runDbFixture<{ usernames: string[] }>("createTempUsersFixture", [options]);

export const deleteUsersByPrefix = (prefix: string) =>
  runDbFixture<null>("deleteUsersByPrefix", [prefix]);
