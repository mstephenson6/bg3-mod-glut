/**
 * JSON config schema and pipeline factory.
 *
 * This module is the bridge between the data layer (`documents.json`) and the
 * execution layer (`src/pipeline.ts`).  It defines the JSON-serialisable
 * `DocumentConfig` / `RendererConfig` / `TransformerConfig` types and the
 * `buildPipelinesFromConfig` function that converts them into the
 * `DocumentPipeline` values that `runPipeline` expects.
 *
 * To add support for a new renderer type:
 *   1. Create `src/renderers/<format>.ts` exporting a factory and its options type.
 *   2. Add a new member to the `RendererConfig` union below.
 *   3. Add a new `case` to the `switch` in `buildPipelinesFromConfig`.
 *   4. Add renderer entries with `"type": "<format>"` to `documents.json`.
 *
 * To add support for a new transformer type:
 *   1. Create `src/transformers/<name>.ts` exporting a factory and its options type.
 *   2. Add a new member to the `TransformerConfig` union below.
 *   3. Add a new `case` to the transformer `switch` in `buildPipelinesFromConfig`.
 *   4. Add transformer entries with `"type": "<name>"` to `documents.json`.
 *
 * Nothing in the entry point (`index.ts`) or in any document data needs to
 * change when a new renderer or transformer type is added here.
 */

import {
  createHtmlRenderer,
  type HtmlRendererOptions,
} from "./renderers/html.ts";
import {
  createMarkdownRenderer,
  type MarkdownRendererOptions,
} from "./renderers/markdown.ts";
import { createIdentityTransformer } from "./transformers/identity.ts";
import type { DocumentPipeline, Transformer } from "./types.ts";

// ── Renderer config types ─────────────────────────────────────────────────────

/**
 * JSON-serialisable config for a Markdown renderer.
 *
 * The `type` discriminant is the only addition on top of `MarkdownRendererOptions`;
 * all other fields are forwarded verbatim to `createMarkdownRenderer`.
 */
export type MarkdownRendererConfig = {
  readonly type: "markdown";
} & MarkdownRendererOptions;

/**
 * JSON-serialisable config for an HTML renderer.
 *
 * The `type` discriminant is the only addition on top of `HtmlRendererOptions`;
 * all other fields are forwarded verbatim to `createHtmlRenderer`.
 */
export type HtmlRendererConfig = {
  readonly type: "html";
} & HtmlRendererOptions;

/**
 * Discriminated union of every supported renderer configuration.
 *
 * The `type` field is the discriminant; switch on it to resolve a config to
 * its concrete `Renderer` instance.
 */
export type RendererConfig = MarkdownRendererConfig | HtmlRendererConfig;

// ── Transformer config types ──────────────────────────────────────────────────

/**
 * JSON-serialisable config for the identity transformer.
 * No options — it is purely a no-op pass-through.
 */
export type IdentityTransformerConfig = { readonly type: "identity" };

/**
 * Discriminated union of every supported transformer configuration.
 * Add new members here as new transformer types are implemented.
 */
export type TransformerConfig = IdentityTransformerConfig;

// ── Document config type ──────────────────────────────────────────────────────

/**
 * JSON-serialisable description of one document, its transformers, and its
 * output renderers.
 *
 * This is the shape of each entry in `documents.json`.  It maps 1-to-1 to a
 * `DocumentPipeline` at runtime; `buildPipelinesFromConfig` performs that
 * translation.
 */
export interface DocumentConfig {
  /** Google Docs document ID (the long alphanumeric string in the URL). */
  readonly documentId: string;

  /**
   * Zero or more transformer configs to apply after ingest, in order.
   * Omit to run no transformers.
   */
  readonly transformers?: readonly TransformerConfig[];

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
 * Each transformer config is resolved to the concrete `Transformer` instance
 * via the appropriate factory function, selected by switching on
 * `transformerConfig.type`.
 *
 * @example
 * ```ts
 * const configs = JSON.parse(await readFile("./documents.json", "utf-8")) as DocumentConfig[];
 * const pipelines = buildPipelinesFromConfig(configs);
 * await Promise.all(pipelines.map((p) => runPipeline(p)));
 * ```
 */
export const buildPipelinesFromConfig = (
  configs: readonly DocumentConfig[],
): DocumentPipeline[] =>
  configs.map(({ documentId, transformers = [], renderers }) => ({
    documentId,
    transformers: transformers.map((transformerConfig): Transformer => {
      switch (transformerConfig.type) {
        case "identity":
          return createIdentityTransformer();

        default: {
          // Exhaustiveness guard: once `TransformerConfig` is a true union of
          // two or more members, TypeScript narrows the type here to `never`
          // and the pattern
          //
          //   const _exhaustive: never = transformerConfig;
          //
          // will surface any unhandled case at compile time.  With a single-
          // member type alias TypeScript does not produce that narrowing, so
          // the guard is expressed as a runtime throw until a second
          // transformer type is added to the union.
          throw new Error(
            `Unknown transformer type: ${String((transformerConfig as { type: unknown }).type)}`,
          );
        }
      }
    }),
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
            `Unknown renderer type: ${String((_exhaustive as { type: unknown }).type)}`,
          );
        }
      }
    }),
  }));
