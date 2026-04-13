type OAuthProfile = Record<string, unknown>;

export const profileImage = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const profileName = (value: unknown): string =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

export const fallbackEmail = (provider: string, accountId: unknown): string =>
  `${provider}-${String(accountId)}@users.local`;

const firstStringValue = (
  profile: OAuthProfile,
  keys: Array<keyof OAuthProfile>,
): string | null => {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

export function mapOidcProfileToUser(profile: OAuthProfile) {
  const accountId = firstStringValue(profile, ["sub", "id", "user_id"]);
  if (!accountId) {
    throw new Error("OIDC profile is missing a stable account identifier");
  }

  const email =
    typeof profile.email === "string" && profile.email.length > 0
      ? profile.email
      : null;
  const emailVerified =
    typeof profile.email_verified === "boolean"
      ? profile.email_verified
      : typeof profile.emailVerified === "boolean"
        ? profile.emailVerified
        : false;
  const displayName =
    profileName(
      profile.name ??
        profile.preferred_username ??
        profile.nickname ??
        profile.email,
    ) || `USTC User ${accountId}`;

  return {
    id: accountId,
    email: email ?? fallbackEmail("oidc", accountId),
    name: displayName,
    image: profileImage(profile.picture),
    emailVerified: Boolean(email && emailVerified),
  };
}
