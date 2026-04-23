import { describe, expect, it } from "vitest";
import {
  asGenericOAuthApi,
  asOAuthProviderApi,
  asOAuthProviderMetadataAuth,
} from "@/lib/oauth/provider-api";

describe("provider-api guards", () => {
  it("accepts the expected OAuth provider API surface", async () => {
    const api = asOAuthProviderApi({
      adminCreateOAuthClient: async () => ({ client_id: "client-1" }),
      getOAuthClientPublic: async () => ({ client_id: "client-1" }),
    });

    await expect(
      api.adminCreateOAuthClient({
        headers: new Headers(),
        body: {
          client_name: "Client",
          redirect_uris: ["https://example.com/callback"],
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code"],
          response_types: ["code"],
          scope: "openid profile",
          require_pkce: true,
          skip_consent: false,
          enable_end_session: false,
          metadata: {},
        },
      }),
    ).resolves.toMatchObject({ client_id: "client-1" });
  });

  it("throws a clear error when the provider API is missing required methods", () => {
    expect(() => asOAuthProviderApi({})).toThrow(
      /missing adminCreateOAuthClient\(\)/,
    );
  });

  it("throws a clear error when metadata auth is missing required methods", () => {
    expect(() => asOAuthProviderMetadataAuth({ api: {} })).toThrow(
      /missing getOAuthServerConfig\(\)/,
    );
  });

  it("throws a clear error when generic OAuth API is missing signInWithOAuth2", () => {
    expect(() => asGenericOAuthApi({})).toThrow(/missing signInWithOAuth2\(\)/);
  });
});
