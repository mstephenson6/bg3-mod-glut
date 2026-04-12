/**
 * Markdown file renderer.
 *
 * Converts a clean HAST tree to Markdown via the mdast intermediate
 * representation and writes the result to disk.
 *
 * Use `createMarkdownRenderer` to produce a `Renderer` instance configured
 * for a specific output path.
 */

import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { writeFile } from "node:fs/promises";
import type { Options as ToMdastOptions } from "hast-util-to-mdast";
import type { Options as ToMarkdownOptions } from "mdast-util-to-markdown";
import type { Root } from "hast";
import type { Renderer } from "../types.ts";

export interface MarkdownRendererOptions {
  /** Path where the rendered Markdown file will be written. */
  readonly outputPath: string;

  /**
   * Options forwarded to `hast-util-to-mdast`.
   * Controls how HAST nodes are mapped to their mdast equivalents —
   * useful for overriding default handlers or enabling extensions.
   * Omit to use the library defaults.
   */
  readonly mdastOptions?: ToMdastOptions;

  /**
   * Options forwarded to `mdast-util-to-markdown`.
   * Controls serialisation details such as bullet style, fence character,
   * emphasis markers, and active extensions (e.g. GFM tables).
   * Omit to use the library defaults.
   */
  readonly markdownOptions?: ToMarkdownOptions;
}

/**
 * Create a Markdown `Renderer` for the given options.
 *
 * The returned renderer:
 *   1. Converts the incoming HAST tree to an mdast tree via `hast-util-to-mdast`.
 *   2. Serialises the mdast tree to a Markdown string via `mdast-util-to-markdown`.
 *   3. Writes the result to `options.outputPath`.
 *
 * The two-step HAST → mdast → Markdown conversion mirrors the unified
 * ecosystem's layered design: keeping the intermediate mdast tree available
 * makes it straightforward to apply mdast transforms (e.g. remark plugins)
 * in the future without changing the renderer interface.
 *
 * @example
 * ```ts
 * createMarkdownRenderer({ outputPath: "../README.md" })
 * ```
 */
export const createMarkdownRenderer = (
  options: MarkdownRendererOptions
): Renderer => ({
  label: `Markdown → ${options.outputPath}`,

  async render(hast: Root): Promise<void> {
    const mdast = toMdast(hast, options.mdastOptions);
    const markdown = toMarkdown(mdast, options.markdownOptions);

    await writeFile(options.outputPath, markdown);
    console.debug(`[markdown] Wrote ${options.outputPath}`);
  },
});
