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
 * Everything the pipeline needs to build one document's outputs.
 *
 * Add a new document by creating a new `DocumentPipeline` value and passing
 * it to `runPipeline` in the entry-point.
 */
export interface DocumentPipeline {
  /** Google Docs document ID (the long alphanumeric string in the URL). */
  readonly documentId: string;

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
