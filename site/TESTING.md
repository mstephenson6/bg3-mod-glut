# Testing & Credentials Setup

## Getting a Google OAuth2 Refresh Token

The build pipeline fetches documents from the Google Docs API using OAuth2.
Use the OAuth 2.0 Playground to generate a refresh token scoped to read-only
document access.

### Steps

1. **Open the OAuth 2.0 Playground**
   https://developers.google.com/oauthplayground/

2. **Use your own OAuth credentials (recommended)**
   Click the ⚙️ gear icon (top right), check *"Use your own OAuth credentials"*,
   and enter your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from `.env`.
   This ensures the refresh token is tied to your registered OAuth app.

3. **Select the scope**
   In the *Step 1* panel, scroll to *Google Docs API v1* and check:
   ```
   https://www.googleapis.com/auth/documents.readonly
   ```
   This is the narrowest available scope — read-only access to documents, nothing else.

4. **Authorize**
   Click *"Authorize APIs"*, sign in with the Google account that owns the
   documents, and grant access.

5. **Exchange for tokens**
   In the *Step 2* panel, click *"Exchange authorization code for tokens"*.
   Copy the value of `refresh_token` from the response.

6. **Save to `.env`**
   ```
   GOOGLE_REFRESH_TOKEN=<paste token here>
   ```

### Notes

- The refresh token does not expire on its own.
- It will be revoked if you change your Google account password or manually
  revoke access at https://myaccount.google.com/permissions.
- In CI or automated environments where a short-lived token is available,
  set `GOOGLE_ACCESS_TOKEN` directly to skip the refresh flow entirely —
  see `src/auth.ts` for resolution order.

### Required `.env` variables

| Variable | Purpose |
|---|---|
| `GOOGLE_REFRESH_TOKEN` | Long-lived token used to obtain access tokens |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret from Google Cloud Console |
| `GOOGLE_ACCESS_TOKEN` | Optional — bypasses the refresh flow if set |