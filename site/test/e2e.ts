/**
 * End-to-end content comparison test.
 *
 * Compares the text content of <main> in the most recently built
 * `dist/index.html` against the currently hosted circleofthespores.dev.
 *
 * Run after a build to verify the new output matches (or intentionally
 * differs from) what is live before deploying.
 *
 * Usage:
 *   npm run build && npm run test:e2e
 */

import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";

// ── HTML normalisation helpers ─────────────────────────────────────────────────

/**
 * Decode numeric and common named HTML entities so that encoding differences
 * between builds don't produce false positives.
 *
 * Handles hex (`&#x27;`), decimal (`&#39;`), and the five standard named
 * entities, plus `&nbsp;`.
 */
const decodeEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

/**
 * Extract and normalise the text content of the `<main>` element from an
 * HTML string.
 *
 * Steps:
 *   1. Isolate everything between the opening and closing `<main>` tags.
 *   2. Strip all HTML tags.
 *   3. Decode HTML entities.
 *   4. Collapse runs of whitespace to a single space and trim.
 *
 * The result is a plain-text representation of the document body that is
 * immune to cosmetic HTML changes (indentation, attribute order, tag
 * formatting) while still catching any change in actual content.
 *
 * @param html    Full HTML document string.
 * @param source  Human-readable label used in the error message.
 */
const extractMainText = (html: string, source: string): string => {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!match) {
    throw new Error(`No <main> element found in ${source}`);
  }
  return decodeEntities(match[1].replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
};

// ── Test ───────────────────────────────────────────────────────────────────────

test("dist/index.html <main> content matches live circleofthespores.dev", async () => {
  const [localHtml, response] = await Promise.all([
    readFile("dist/index.html", "utf-8"),
    fetch("https://circleofthespores.dev"),
  ]);

  assert.ok(
    response.ok,
    `Failed to fetch circleofthespores.dev — HTTP ${response.status} ${response.statusText}`
  );

  const remoteHtml = await response.text();

  const localText = extractMainText(localHtml, "dist/index.html");
  const remoteText = extractMainText(remoteHtml, "circleofthespores.dev");

  assert.equal(localText, remoteText);
});
