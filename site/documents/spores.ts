/**
 * Pipeline configuration for the "Glut's Circle of Animating Spores" document.
 *
 * This file is the single source of truth for everything related to building
 * the spores document — the Google Doc ID, HTML document/meta options, and
 * the list of output renderers.
 *
 * To add a new output format for this document, import the appropriate
 * renderer factory and add it to the `renderers` array.
 * To add a new document entirely, copy this file and adjust the values.
 */

import { createHtmlRenderer } from "../src/renderers/html.ts";
import { createMarkdownRenderer } from "../src/renderers/markdown.ts";
import type { DocumentPipeline } from "../src/types.ts";

// ── Document identity ─────────────────────────────────────────────────────────

export const SPORES_DOC_ID = "11nWtOTEWcI_TEt8WE1vfS3_NsWLIDIK01ClhKDgmJiY";

// ── Pipeline configuration ────────────────────────────────────────────────────

export const sporesPipeline: DocumentPipeline = {
  documentId: SPORES_DOC_ID,
  renderers: [
    // Markdown — written to the repository root so GitHub renders it as the
    // project README without any extra tooling.
    createMarkdownRenderer({
      outputPath: "../README.md",
    }),

    // HTML — the production website artifact served from Cloudflare Pages.
    createHtmlRenderer({
      outputPath: "dist/index.html",
      documentOptions: {
        css: ["pico.classless.css", "spores.css"],
        language: "en",
        link: [
          {
            rel: "icon",
            href: "getty-images-0lwm492K9V8-unsplash-2.svg",
            type: "image/svg+xml",
          },
        ],
        responsive: true,
        title: "BG3 Mod: Glut's Circle of Animating Spores",
      },
      metaOptions: {
        description:
          "Circle of the Spores Druids become master necromancers early in Baldur's Gate 3. Use improved Animating Spores to command Spore Servants beyond the powers of Sovereign Glut.",
        image: {
          alt: "Spore Servants Andor and Mari flank a Duergar Druid in the Dank Crypt. Andor holds a torch overhead and Mari has a bow equipped.",
          height: "900",
          url: "https://circleofthespores.dev/duegar_andor_mari_1600_900_deta.png",
          width: "1600",
        },
        og: true,
        title: "BG3 Mod: Glut's Circle of Animating Spores",
        twitter: true,
        type: "article",
      },
    }),
  ],
};
