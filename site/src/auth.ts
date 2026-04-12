/**
 * Google OAuth2 token management.
 *
 * Reads credentials from environment variables.  Provide a pre-issued
 * access token via GOOGLE_ACCESS_TOKEN to skip the refresh flow entirely
 * (useful in CI / automated builds where a short-lived token is injected).
 *
 * Required env vars (when no access token is provided directly):
 *   GOOGLE_REFRESH_TOKEN
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Exchange the refresh token for a fresh access token.
 * Throws if the response contains an OAuth error.
 */
const refreshAccessToken = async (): Promise<string> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  });

  const request = new Request(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const response = await fetch(request);
  const data: TokenResponse = await response.json();

  if (data.error) {
    throw new Error(
      `OAuth2 token refresh failed: ${data.error} – ${data.error_description ?? "(no description)"}`
    );
  }

  return data.access_token;
};

/**
 * Returns a valid Google API access token.
 *
 * Resolution order:
 *   1. GOOGLE_ACCESS_TOKEN env var (pre-issued, skips network call)
 *   2. Refresh flow using GOOGLE_REFRESH_TOKEN + client credentials
 */
export const getAccessToken = async (): Promise<string> => {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }
  return refreshAccessToken();
};
