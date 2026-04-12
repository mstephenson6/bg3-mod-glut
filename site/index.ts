// Architecture: see site/ARCHITECTURE.md for layer map, key decisions, and extension patterns.

import "dotenv/config";
import { readFile, cp } from "node:fs/promises";
import { runPipeline } from "./src/pipeline.ts";
import { buildPipelinesFromConfig } from "./src/config.ts";
import type { DocumentConfig } from "./src/config.ts";

const configs = JSON.parse(
  await readFile("./documents.json", "utf-8"),
) as DocumentConfig[];

const pipelines = buildPipelinesFromConfig(configs);

// All document pipelines run concurrently — each is fully independent.
await Promise.all(pipelines.map((pipeline) => runPipeline(pipeline)));

// Copy shared assets once after all renders settle so no renderer races with
// the copy operation.
await cp("assets", "dist", { recursive: true });
console.debug("[build] Copied assets: assets → dist");
