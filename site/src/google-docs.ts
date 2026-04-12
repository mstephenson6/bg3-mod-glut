/**
 * Google Docs REST API client.
 *
 * Thin wrapper around the Documents.get endpoint.  Authentication is
 * delegated entirely to `./auth.ts` so this module only has to reason about
 * the shape of the request / response.
 *
 * API reference:
 *   https://developers.google.com/docs/api/reference/rest/v1/documents/get
 */

import { getAccessToken } from "./auth.ts";

const DOCS_ENDPOINT = "https://docs.googleapis.com/v1/documents";

/**
 * Fetch a Google Docs document by its ID and return the raw JSON response.
 *
 * The returned object matches the structure expected by
 * `@googleworkspace/google-docs-hast`'s `toHast()`.
 *
 * @param documentId  The document ID found in the Docs URL:
 *                    https://docs.google.com/document/d/<documentId>/edit
 */
export const fetchDocument = async (documentId: string): Promise<unknown> => {
  const url = `${DOCS_ENDPOINT}/${documentId}`;
  const token = await getAccessToken();

  const request = new Request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const response = await fetch(request);

  if (!response.ok) {
    throw new Error(
      `Google Docs API error for document "${documentId}": ` +
        `${response.status} ${response.statusText}`
    );
  }

  return response.json();
};
