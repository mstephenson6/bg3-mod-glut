/**
 * HAST transformation utilities.
 *
 * Responsible for the fetch → raw doc → clean HAST tree step of the pipeline.
 * "Clean" means the tree carries semantic structure only — all inline styles
 * and class names injected by Google Docs are stripped so that downstream
 * renderers can apply their own presentation layer.
 */

import { toHast as googleDocToHast } from "@googleworkspace/google-docs-hast";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { fetchDocument } from "./google-docs.ts";

/**
 * Remove all `className` and `style` properties from every element node in
 * the given HAST tree.  Mutates the tree in place and returns it for
 * convenient chaining.
 *
 * Stripping these properties lets downstream renderers (HTML, Markdown, …)
 * apply their own presentation layer without fighting Google's inline styles.
 */
export const stripStyles = (tree: Root): Root => {
  visit(tree, "element", (node: Element) => {
    if (!node.properties) return;
    delete node.properties["className"];
    delete node.properties["style"];
  });
  return tree;
};

/**
 * Fetch a Google Docs document and convert it to a clean HAST tree.
 *
 * This is the single entry point for the "ingest" phase of the pipeline:
 *   1. Fetch the raw document JSON from the Google Docs API.
 *   2. Convert it to a HAST tree via `@googleworkspace/google-docs-hast`.
 *   3. Strip all inline styles and class names.
 *
 * The resulting tree is presentation-agnostic and can be handed to any
 * number of renderers without further modification.
 *
 * @param documentId  The Google Docs document ID.
 */
export const fetchAndTransform = async (documentId: string): Promise<Root> => {
  const doc = await fetchDocument(documentId);
  const tree = googleDocToHast(doc) as Root;
  return stripStyles(tree);
};
