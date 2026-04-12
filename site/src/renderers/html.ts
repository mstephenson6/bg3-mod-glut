/**
 * HTML file renderer.
 *
 * Wraps a clean HAST tree in a full HTML document with <header>, <main>, and
 * <footer> landmark elements, runs it through the rehype formatting pipeline,
 * and writes the result to disk.
 *
 * Use `createHtmlRenderer` to produce a `Renderer` instance configured for a
 * specific output path and document/meta options.
 */

import { unified } from "unified";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import rehypeMeta from "rehype-meta";
import { writeFile } from "node:fs/promises";
import type { Root, Element } from "hast";
import type { Options as DocumentOptions } from "rehype-document";
import type { Options as MetaOptions } from "rehype-meta";
import type { Renderer } from "../types.ts";

export interface HtmlRendererOptions {
  /** Path where the rendered HTML file will be written. */
  readonly outputPath: string;

  /**
   * Options forwarded to `rehype-document`.
   * Controls the wrapping `<html>` document: title, charset, CSS links,
   * viewport meta, language, etc.
   */
  readonly documentOptions: DocumentOptions;

  /**
   * Options forwarded to `rehype-meta`.
   * Controls Open Graph, Twitter Card, and other `<meta>` tags.
   * Omit or pass an empty object to skip social meta tags.
   */
  readonly metaOptions?: MetaOptions;
}

/**
 * Build the page skeleton that wraps the document content.
 *
 * The content of the HAST tree is placed inside a semantic <main> element,
 * flanked by empty <header> and <footer> elements that stylesheets or future
 * renderers can populate.
 *
 * Returns a minimal HAST Root whose children can be processed by
 * rehype-document into a complete HTML page.
 */
const buildPageLayout = (contentChildren: Root["children"]): Root => ({
  type: "root",
  children: [
    {
      type: "element",
      tagName: "header",
      properties: {},
      children: [],
    } satisfies Element,
    {
      type: "element",
      tagName: "main",
      properties: {},
      children: contentChildren,
    } satisfies Element,
    {
      type: "element",
      tagName: "footer",
      properties: {},
      children: [],
    } satisfies Element,
  ],
});

/**
 * Create an HTML `Renderer` for the given options.
 *
 * The returned renderer:
 *   1. Wraps the incoming HAST children in a <header> / <main> / <footer> layout.
 *   2. Runs the tree through rehype-document → rehype-meta → rehype-format.
 *   3. Serialises to an HTML string via rehype-stringify.
 *   4. Writes the result to `options.outputPath`.
 *
 * @example
 * ```ts
 * createHtmlRenderer({
 *   outputPath: "dist/index.html",
 *   documentOptions: { title: "My Page", css: ["style.css"], responsive: true },
 *   metaOptions: { og: true, twitter: true },
 * })
 * ```
 */
export const createHtmlRenderer = (options: HtmlRendererOptions): Renderer => ({
  label: `HTML → ${options.outputPath}`,

  async render(hast: Root): Promise<void> {
    const layout = buildPageLayout(hast.children);

    const outputHast = await unified()
      .use(rehypeDocument, options.documentOptions)
      .use(rehypeMeta, options.metaOptions ?? {})
      .use(rehypeFormat)
      .run(layout);

    const html = unified().use(rehypeStringify).stringify(outputHast);

    await writeFile(options.outputPath, html);
    console.debug(`[html] Wrote ${options.outputPath}`);
  },
});
