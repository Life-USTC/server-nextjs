export type AppSession = {
  session: SessionShape;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    username: string | null;
    isAdmin: boolean;
    profilePictures: string[];
  };
};

type SessionShape = {
  id?: string;
  token?: string;
  expiresAt?: Date | string;
} & Record<string, unknown>;

type RawSessionLike = {
  session: SessionShape;
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  } & Record<string, unknown>;
};

type RawUserLike = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
} & Record<string, unknown>;

export function normalizeSessionUser(user: RawUserLike): AppSession["user"] {
  const profilePictures = Array.isArray(user.profilePictures)
    ? user.profilePictures.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image ?? null,
    username:
      typeof user.username === "string" && user.username.length > 0
        ? user.username
        : null,
    isAdmin: Boolean(user.isAdmin),
    profilePictures,
  };
}

export function mapAppSession(session: RawSessionLike): AppSession {
  return {
    session: session.session,
    user: normalizeSessionUser(session.user),
  };
}
