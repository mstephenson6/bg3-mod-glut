/**
 * @deprecated
 *
 * This file has been superseded by the modular pipeline architecture.
 * All values previously exported from here have been moved to:
 *
 *   documents/spores.ts
 *
 * References:
 *   - `sporesDocId`   → `SPORES_DOC_ID`       in documents/spores.ts
 *   - `sporesDocOpts` → `documentOptions` field inside `sporesPipeline`
 *   - `sporesMetaOpts`→ `metaOptions` field inside `sporesPipeline`
 *
 * This file is kept temporarily to avoid breaking any external tooling that
 * may still import from it.  It will be removed in a future cleanup pass.
 * Do not add new exports here.
 */

import type { Options as DocumentOptions } from "rehype-document";
import type { Options as MetaOptions } from "rehype-meta";

/** @deprecated Use `SPORES_DOC_ID` from `documents/spores.ts` instead. */
export const sporesDocId = "11nWtOTEWcI_TEt8WE1vfS3_NsWLIDIK01ClhKDgmJiY";

/** @deprecated Use the `documentOptions` field in `sporesPipeline` (documents/spores.ts) instead. */
export const sporesDocOpts: DocumentOptions = {
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
};

/** @deprecated Use the `metaOptions` field in `sporesPipeline` (documents/spores.ts) instead. */
export const sporesMetaOpts: MetaOptions = {
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
};
