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

export function mapAppSession(session: RawSessionLike): AppSession {
  const profilePictures = Array.isArray(session.user.profilePictures)
    ? session.user.profilePictures.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return {
    session: session.session,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || null,
      image: session.user.image ?? null,
      username:
        typeof session.user.username === "string" &&
        session.user.username.length > 0
          ? session.user.username
          : null,
      isAdmin: Boolean(session.user.isAdmin),
      profilePictures,
    },
  };
}
