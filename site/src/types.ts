import type { Root as HastRoot } from "hast";

/**
 * A Renderer consumes a clean HAST tree and produces some output artifact
 * (e.g. an HTML file, a Markdown file, a JSON file, …).
 *
 * Implement this interface to add a new output format without touching the
 * pipeline or any other renderer.
 */
export interface Renderer {
  /** Human-readable label used in log output. */
  readonly label: string;
  render(hast: HastRoot): Promise<void>;
}

/**
 * A Transformer receives the current HAST tree and returns a (possibly
 * modified) tree.  Transformers run sequentially between the ingest phase
 * and the render phase: each one's output becomes the next one's input, and
 * the final tree is handed to every renderer read-only.
 *
 * Unlike renderers, transformers are permitted — and expected — to produce
 * a new or modified tree.  A transformer that does not need to change the
 * tree should return its input unchanged (see `src/transformers/identity.ts`).
 */
export interface Transformer {
  /** Human-readable label used in log output. */
  readonly label: string;
  transform(hast: HastRoot): Promise<HastRoot>;
}

/**
 * Everything the pipeline needs to build one document's outputs.
 *
 * Add a new document by creating a new `DocumentPipeline` value and passing
 * it to `runPipeline` in the entry-point.
 */
export interface DocumentPipeline {
  /** Google Docs document ID (the long alphanumeric string in the URL). */
  readonly documentId: string;

  /**
   * Zero or more transformers to run against the HAST tree after ingest and
   * before rendering.  Transformers execute sequentially in array order; each
   * receives the output of the previous.  Omit or leave empty to skip the
   * transform phase.
   */
  readonly transformers?: readonly Transformer[];

  /**
   * One or more renderers to run against the fetched document.
   * Each renderer is independent — they all receive the same clean HAST tree
   * and can be added, removed, or reordered freely.
   */
  readonly renderers: readonly Renderer[];
}

/**
 * Describes a single static-asset copy operation performed as part of a build.
 */
export interface AssetCopy {
  readonly src: string;
  readonly dest: string;
}
