/**
 * Identity transformer.
 *
 * Returns its input tree unchanged.  Useful as a no-op placeholder while
 * building out the transformer chain, and as a reference implementation for
 * new transformers.
 */
import type { Root } from "hast";
import type { Transformer } from "../types.ts";

export const createIdentityTransformer = (): Transformer => ({
  label: "identity",
  async transform(hast: Root): Promise<Root> {
    return hast;
  },
});
