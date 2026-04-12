// Architecture: see site/ARCHITECTURE.md for layer map, key decisions, and extension patterns.

import "dotenv/config";

import { runPipeline } from "./src/pipeline.ts";
import { sporesPipeline } from "./documents/spores.ts";

/**
 * Entry point.
 *
 * Add additional `DocumentPipeline` imports and `runPipeline` calls here to
 * build more documents.  Each pipeline is independent — they can run
 * concurrently with `Promise.all` if the output paths don't conflict, or
 * sequentially if they share a destination directory.
 *
 * Assets are declared here rather than inside each `DocumentPipeline` because
 * they are a build-level concern: the `assets/` directory is shared across
 * all documents and should only be copied once per build.
 */
await runPipeline(sporesPipeline, {
  assets: [{ src: "assets", dest: "dist" }],
});
