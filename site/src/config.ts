/**
 * JSON config schema and pipeline factory.
 *
 * This module is the bridge between the data layer (`documents.json`) and the
 * execution layer (`src/pipeline.ts`).  It defines the JSON-serialisable
 * `DocumentConfig` / `RendererConfig` types and the `buildPipelinesFromConfig`
 * function that converts them into the `DocumentPipeline` values that
 * `runPipeline` expects.
 *
 * To add support for a new renderer type:
 *   1. Create `src/renderers/<format>.ts` exporting a factory and its options type.
 *   2. Add a new member to the `RendererConfig` union below.
 *   3. Add a new `case` to the `switch` in `buildPipelinesFromConfig`.
 *   4. Add renderer entries with `"type": "<format>"` to `documents.json`.
 *
 * Nothing in the entry point (`index.ts`) or in any document data needs to
 * change when a new renderer type is added here.
 */

import {
  createHtmlRenderer,
  type HtmlRendererOptions,
} from "./renderers/html.ts";
import {
  createMarkdownRenderer,
  type MarkdownRendererOptions,
} from "./renderers/markdown.ts";
import type { DocumentPipeline } from "./types.ts";

// ── Renderer config types ─────────────────────────────────────────────────────

/**
 * JSON-serialisable config for a Markdown renderer.
 *
 * The `type` discriminant is the only addition on top of `MarkdownRendererOptions`;
 * all other fields are forwarded verbatim to `createMarkdownRenderer`.
 */
export type MarkdownRendererConfig = { readonly type: "markdown" } & MarkdownRendererOptions;

/**
 * JSON-serialisable config for an HTML renderer.
 *
 * The `type` discriminant is the only addition on top of `HtmlRendererOptions`;
 * all other fields are forwarded verbatim to `createHtmlRenderer`.
 */
export type HtmlRendererConfig = { readonly type: "html" } & HtmlRendererOptions;

/**
 * Discriminated union of every supported renderer configuration.
 *
 * The `type` field is the discriminant; switch on it to resolve a config to
 * its concrete `Renderer` instance.
 */
export type RendererConfig = MarkdownRendererConfig | HtmlRendererConfig;

// ── Document config type ──────────────────────────────────────────────────────

/**
 * JSON-serialisable description of one document and its output renderers.
 *
 * This is the shape of each entry in `documents.json`.  It maps 1-to-1 to a
 * `DocumentPipeline` at runtime; `buildPipelinesFromConfig` performs that
 * translation.
 */
export interface DocumentConfig {
  /** Google Docs document ID (the long alphanumeric string in the URL). */
  readonly documentId: string;

  /**
   * One or more renderer configs to run against the fetched document.
   * Each entry's `type` field determines which factory is used.
   */
  readonly renderers: readonly RendererConfig[];
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Convert an array of JSON-serialisable `DocumentConfig` objects into the
 * `DocumentPipeline` values that `runPipeline` expects.
 *
 * Each renderer config is resolved to the concrete `Renderer` instance via the
 * appropriate factory function, selected by switching on `rendererConfig.type`.
 *
 * @example
 * ```ts
 * const configs = JSON.parse(await readFile("./documents.json", "utf-8")) as DocumentConfig[];
 * const pipelines = buildPipelinesFromConfig(configs);
 * await Promise.all(pipelines.map((p) => runPipeline(p)));
 * ```
 */
export const buildPipelinesFromConfig = (
  configs: readonly DocumentConfig[]
): DocumentPipeline[] =>
  configs.map(({ documentId, renderers }) => ({
    documentId,
    renderers: renderers.map((rendererConfig) => {
      switch (rendererConfig.type) {
        case "markdown":
          // `rendererConfig` is narrowed to `MarkdownRendererConfig` here.
          // Passing it directly is safe: `createMarkdownRenderer` only reads
          // the keys it cares about, and the extra `type` field is harmless.
          return createMarkdownRenderer(rendererConfig);

        case "html":
          // Same reasoning as above — `createHtmlRenderer` ignores `type`.
          return createHtmlRenderer(rendererConfig);

        default: {
          // Compile-time exhaustiveness guard: if a new union member is added
          // to `RendererConfig` without a matching `case`, TypeScript will
          // error here because `rendererConfig` will no longer be `never`.
          const _exhaustive: never = rendererConfig;
          throw new Error(
            `Unknown renderer type: ${String((_exhaustive as { type: unknown }).type)}`
          );
        }
      }
    }),
  }));
