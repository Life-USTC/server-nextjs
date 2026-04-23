export type AdminCreateOAuthClientInput = {
  headers: Headers;
  body: {
    client_name: string;
    redirect_uris: string[];
    token_endpoint_auth_method: string;
    grant_types: string[];
    response_types: string[];
    scope: string;
    require_pkce: boolean;
    skip_consent: boolean;
    enable_end_session: boolean;
    metadata: Record<string, string>;
  };
};

export type AdminCreateOAuthClientResult = {
  client_id: string;
  client_secret?: string | null;
};

export type OAuthClientPublicResult = {
  client_id: string;
  client_name?: string | null;
};

export type OAuthProviderApi = {
  adminCreateOAuthClient(
    input: AdminCreateOAuthClientInput,
  ): Promise<AdminCreateOAuthClientResult>;
  getOAuthClientPublic(input: {
    headers: Headers;
    query: { client_id: string };
  }): Promise<OAuthClientPublicResult>;
};

export type OAuthProviderMetadataAuth = {
  api: {
    getOAuthServerConfig: (...args: unknown[]) => unknown;
    getOpenIdConfig: (...args: unknown[]) => unknown;
  };
};

export type GenericOAuthApi = {
  signInWithOAuth2(input: {
    body: {
      providerId: string;
      callbackURL: string;
    };
  }): Promise<unknown>;
};

function asRecord(
  value: unknown,
  errorMessage: string,
): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  throw new Error(errorMessage);
}

function requireMethod<TArgs extends unknown[], TReturn>(
  target: Record<string, unknown>,
  methodName: string,
  errorMessage: string,
): (...args: TArgs) => TReturn {
  const method = target[methodName];
  if (typeof method !== "function") {
    throw new Error(errorMessage);
  }
  return method.bind(target) as (...args: TArgs) => TReturn;
}

export function asOAuthProviderApi(api: unknown): OAuthProviderApi {
  const record = asRecord(
    api,
    "Better Auth OAuth provider API is unavailable: expected an object API surface",
  );

  return {
    adminCreateOAuthClient: requireMethod(
      record,
      "adminCreateOAuthClient",
      "Better Auth OAuth provider API is unavailable: missing adminCreateOAuthClient()",
    ),
    getOAuthClientPublic: requireMethod(
      record,
      "getOAuthClientPublic",
      "Better Auth OAuth provider API is unavailable: missing getOAuthClientPublic()",
    ),
  };
}

export function asOAuthProviderMetadataAuth(
  auth: unknown,
): OAuthProviderMetadataAuth {
  const authRecord = asRecord(
    auth,
    "Better Auth OAuth metadata API is unavailable: expected an auth instance object",
  );
  const apiRecord = asRecord(
    authRecord.api,
    "Better Auth OAuth metadata API is unavailable: missing auth.api object",
  );

  return {
    api: {
      getOAuthServerConfig: requireMethod(
        apiRecord,
        "getOAuthServerConfig",
        "Better Auth OAuth metadata API is unavailable: missing getOAuthServerConfig()",
      ),
      getOpenIdConfig: requireMethod(
        apiRecord,
        "getOpenIdConfig",
        "Better Auth OAuth metadata API is unavailable: missing getOpenIdConfig()",
      ),
    },
  };
}

export function asGenericOAuthApi(api: unknown): GenericOAuthApi {
  const record = asRecord(
    api,
    "Better Auth generic OAuth API is unavailable: expected an object API surface",
  );

  return {
    signInWithOAuth2: requireMethod(
      record,
      "signInWithOAuth2",
      "Better Auth generic OAuth API is unavailable: missing signInWithOAuth2()",
    ),
  };
}
