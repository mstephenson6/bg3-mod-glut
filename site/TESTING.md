# Testing & Credentials Setup

## End-to-end content test

`npm run test:e2e` compares the `<main>` content of the most recently built
`dist/index.html` against the currently hosted `circleofthespores.dev`.  It
requires no credentials — only a completed local build and a network connection.

### What it checks

The test extracts the inner content of the `<main>` element from both sources,
strips all HTML tags, decodes entities, and collapses whitespace before
comparing.  This makes it immune to cosmetic pipeline changes (indentation,
attribute ordering, tag formatting) while still catching any change in actual
document content.

### Running it

```
npm run build       # fetch from Google Docs, write dist/index.html
npm run test:e2e    # compare dist/index.html <main> to live site
```

Or use the combined script that does both in sequence:

```
npm run ci
```

### Interpreting results

| Result | Meaning |
|---|---|
| ✔ pass | Local build output matches what is currently live — safe to deploy |
| ✖ fail (content diff) | The Google Doc has changed since the last deploy, or a transformer altered the output — review the diff before deploying |
| ✖ fail (no `<main>`) | The HTML structure is broken — the renderer or a transformer produced invalid output |
| ✖ fail (network error) | `circleofthespores.dev` could not be reached — check connectivity |

The test is intentionally strict: a content change that has not yet been
deployed will always fail.  That is the point — it surfaces the delta between
the current build and what users are seeing before you push.

---


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