/**
 * Pipeline orchestration.
 *
 * The pipeline is the top-level coordinator for building one document's
 * outputs.  Given a `DocumentPipeline` config it:
 *
 *   1. Fetches the Google Doc and transforms it to a clean HAST tree.
 *   2. Runs every configured transformer against that tree sequentially,
 *      feeding each one's output into the next.
 *   3. Runs every configured renderer against the final tree (in parallel).
 *   4. Copies any declared static-asset directories to their destinations.
 *
 * Keeping orchestration separate from both the renderers and the document
 * configs means either side can evolve independently — new renderers don't
 * need to know about assets, and new documents don't need to know how the
 * pipeline is wired.
 */

import { cp } from "node:fs/promises";
import { fetchAndTransform } from "./hast.ts";
import type { AssetCopy, DocumentPipeline } from "./types.ts";

export interface PipelineRunOptions {
  /**
   * Static-asset directories to copy after all renderers complete.
   *
   * Asset copies are intentionally decoupled from `DocumentPipeline` because
   * assets are typically shared across all documents in a build — the entry
   * point (or a dedicated build script) should own this concern, not any
   * individual document config.
   *
   * @example
   * assets: [{ src: "assets", dest: "dist" }]
   */
  readonly assets?: readonly AssetCopy[];
}

/**
 * Execute a document pipeline end-to-end.
 *
 * Steps (in order):
 *   1. **Ingest** — fetch the Google Doc and produce a clean, style-free HAST
 *      tree via `fetchAndTransform`.
 *   2. **Transform** — run every `Transformer` in the pipeline sequentially.
 *      Each transformer receives the output of the previous one; the final
 *      tree is what renderers receive.  If no transformers are configured this
 *      step is a no-op.
 *   3. **Render** — invoke every `Renderer` in the pipeline concurrently,
 *      passing each the same immutable HAST tree.  Renderers are independent
 *      and produce their own output artifacts (HTML files, Markdown files, …).
 *   4. **Assets** — copy each declared `{ src, dest }` pair recursively.
 *      Asset copies run sequentially after all renders have settled so that a
 *      renderer writing into the destination directory is never racing with a
 *      concurrent copy.
 *
 * Errors from any transformer, renderer, or asset copy are not swallowed —
 * they propagate out of `runPipeline` so the caller can decide how to handle
 * them (e.g. fail the build, log and continue, etc.).
 *
 * @param pipeline  The document pipeline configuration to execute.
 * @param options   Optional build-level options (asset copies, etc.).
 *
 * @example
 * ```ts
 * await runPipeline(sporesPipeline, {
 *   assets: [{ src: "assets", dest: "dist" }],
 * });
 * ```
 */
export const runPipeline = async (
  pipeline: DocumentPipeline,
  options: PipelineRunOptions = {},
): Promise<void> => {
  const { documentId, transformers = [], renderers } = pipeline;
  const { assets = [] } = options;

  // ── 1. Ingest ──────────────────────────────────────────────────────────────
  console.debug(`[pipeline] Fetching document: ${documentId}`);
  const hast = await fetchAndTransform(documentId);

  // ── 2. Transform ───────────────────────────────────────────────────────────
  // Transformers run sequentially — each receives the output of the previous.
  // The final tree is passed read-only to every renderer in step 3.
  let tree = hast;
  if (transformers.length > 0) {
    console.debug(
      `[pipeline] Running ${transformers.length} transformer(s): ${transformers.map((t) => t.label).join(", ")}`,
    );
    for (const transformer of transformers) {
      tree = await transformer.transform(tree);
    }
  }

  // ── 3. Render ──────────────────────────────────────────────────────────────
  // All renderers receive the same tree concurrently.  The tree must not be
  // mutated by any renderer — stripStyles() already removed presentation data
  // before this point, and renderers should treat the tree as read-only.
  console.debug(
    `[pipeline] Running ${renderers.length} renderer(s): ${renderers.map((r) => r.label).join(", ")}`,
  );
  await Promise.all(renderers.map((renderer) => renderer.render(tree)));

  // ── 4. Assets ──────────────────────────────────────────────────────────────
  for (const { src, dest } of assets) {
    await cp(src, dest, { recursive: true });
    console.debug(`[pipeline] Copied assets: ${src} → ${dest}`);
  }

  console.debug(`[pipeline] Done.`);
};
