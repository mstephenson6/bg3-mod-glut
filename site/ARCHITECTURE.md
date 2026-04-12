# Site Build Architecture

This document captures the structural decisions for the `site/` build pipeline.
Its purpose is to keep future work focused: new documents, new output formats,
new transformers, and new build steps should fit naturally into this structure
rather than work around it.

---

## Layer map

```
site/
  index.ts                  ← entry point: reads documents.json, runs pipelines
  documents.json            ← document registry (add new docs here — no code required)
  src/
    config.ts               ← JSON config loader → DocumentPipeline[]
    types.ts                ← Renderer, Transformer, and DocumentPipeline interfaces
    auth.ts                 ← Google OAuth2 token resolution
    google-docs.ts          ← Google Docs REST API client
    hast.ts                 ← fetch → clean HAST tree (ingest phase)
    pipeline.ts             ← ingest → transform → render → copy assets (orchestration)
    transformers/
      identity.ts           ← identity transformer (no-op reference implementation)
    renderers/
      html.ts               ← rehype HTML renderer factory
      markdown.ts           ← mdast Markdown renderer factory
```

Each layer has exactly one reason to change. Layers only import downward
(entry point → src). No module in `src/` imports from the entry point.

---

## Key decisions

### 1. `Renderer` is the extension point for new output formats

The `Renderer` interface in `src/types.ts` is the only contract a renderer must
satisfy:

```ts
interface Renderer {
  readonly label: string;
  render(hast: Root): Promise<void>;
}
```

To add a new output format — RSS, JSON, a PDF via a headless browser, a second
HTML variant — write a factory function in a new file under `src/renderers/` and
add it to the `renderers` array of the relevant document entry in
`documents.json`. Nothing else changes.

Renderers **must treat the HAST tree as read-only**. `stripStyles()` in
`src/hast.ts` removes all presentation data before the tree reaches any
renderer; renderers apply their own presentation layer and must not mutate the
shared tree.

### 2. A document is a JSON entry in `documents.json`

To add a second Google Doc, add a new entry to `documents.json` — no code
required. The entry follows the `DocumentConfig` schema defined in
`src/config.ts`, which is the bridge between the JSON data and the
`DocumentPipeline` values that `runPipeline` expects.

```ts
interface DocumentConfig {
  readonly documentId: string;
  readonly transformers?: readonly TransformerConfig[];
  readonly renderers: readonly RendererConfig[];
}
```

`src/config.ts` maps each `DocumentConfig` to a `DocumentPipeline` via
`buildPipelinesFromConfig`, which resolves each renderer config
(`{ type: "markdown" | "html", ...options }`) and each transformer config
(`{ type: "identity", ...options }`) to the appropriate factory. Adding a new
renderer or transformer type means adding a new member to the corresponding
config union and a new `case` in `buildPipelinesFromConfig` — nothing in the
entry point or in any document data changes.

All document-specific values — the Google Doc ID, transformer list, renderer
options, output paths — live in `documents.json`. Nothing document-specific
belongs in `src/`.

### 3. Transformers run sequentially between ingest and render

The `Transformer` interface in `src/types.ts` is the extension point for
modifying the HAST tree after it has been fetched and cleaned, but before any
renderer touches it:

```ts
interface Transformer {
  readonly label: string;
  transform(hast: Root): Promise<Root>;
}
```

Transformers form a sequential chain: the output of each transformer becomes the
input of the next, and the final tree is what every renderer receives.
Transformers are permitted — and expected — to produce a new or modified tree.
A transformer that does not need to change the tree should return its input
unchanged (see `src/transformers/identity.ts`).

Renderers still receive the tree as read-only after all transformers have run.
Adding a transformer means:
1. Creating a file in `src/transformers/`.
2. Adding its config type as a new member of the `TransformerConfig` union in
   `src/config.ts`.
3. Adding a matching `case` in the transformer `switch` in
   `buildPipelinesFromConfig`.
4. Listing it under `"transformers"` in the relevant document entry in
   `documents.json`.

### 4. Assets are a build-level concern owned by the entry point

Asset copies are performed in `index.ts`, after all pipelines have settled.
Assets are typically shared across all documents in a build; if they lived
inside a pipeline config they would be copied once per document. The entry
point owns this step and is responsible for ensuring assets are only copied
once.

### 5. Auth and the API client are isolated from transformation

`src/auth.ts` resolves a Google access token (env var shortcut or OAuth2
refresh flow). `src/google-docs.ts` uses that token to call the Docs REST API.
Neither module knows anything about HAST, unified, or file output.

This means the ingest phase (`src/hast.ts`) can be tested or replaced without
touching auth, and auth can be changed (e.g. service-account credentials)
without touching anything else.

---

## Data flow

```
index.ts
  ├─ reads documents.json
  ├─ buildPipelinesFromConfig(configs)               [src/config.ts]
  │
  ├─ Promise.all(pipelines.map(runPipeline))          [src/pipeline.ts]
  │    │
  │    ├─ 1. fetchAndTransform(documentId)            [src/hast.ts]
  │    │       ├─ fetchDocument(documentId)           [src/google-docs.ts]
  │    │       │     └─ getAccessToken()              [src/auth.ts]
  │    │       ├─ googleDocToHast(doc)
  │    │       └─ stripStyles(tree)
  │    │
  │    ├─ 2. for…of transformers (sequential)
  │    │       └─ transformer.transform(tree) → tree  [src/transformers/*.ts]
  │    │            (each output feeds the next)
  │    │
  │    └─ 3. Promise.all(renderers.map(r => r.render(tree)))
  │            ├─ MarkdownRenderer.render(tree)       [src/renderers/markdown.ts]
  │            └─ HtmlRenderer.render(tree)           [src/renderers/html.ts]
  │
  └─ cp("assets", "dist") once after all pipelines settle
```

---

## How to extend

**Add a new output format for an existing document**
1. Create `src/renderers/<format>.ts` exporting a factory that returns a
   `Renderer`.
2. Add a new member to the `RendererConfig` union in `src/config.ts` and a
   matching `case` to the renderer `switch` in `buildPipelinesFromConfig`.
3. Add a renderer entry with `"type": "<format>"` to the relevant document
   in `documents.json`.

**Add a new document**
1. Add a new entry to `documents.json` with a `documentId` and a `renderers`
   array. No code is required — `src/config.ts` translates the JSON
   automatically.

**Add a new transformer**
1. Create `src/transformers/<name>.ts` exporting a factory function that
   returns a `Transformer`.  Use `src/transformers/identity.ts` as the
   reference implementation — it shows the minimal shape required.
2. Add a new config type (e.g. `MyTransformerConfig = { readonly type: "<name>"; ... }`)
   and include it in the `TransformerConfig` union in `src/config.ts`.
3. Add a matching `case` to the transformer `switch` inside
   `buildPipelinesFromConfig` in `src/config.ts`.
4. Add a transformer entry with `"type": "<name>"` (and any options) to the
   `"transformers"` array of the relevant document in `documents.json`.

**Add a new document source (not Google Docs)**
1. Create `src/<source>-client.ts` analogous to `src/google-docs.ts`.
2. Create a new ingest function analogous to `fetchAndTransform` in
   `src/hast.ts` that converts the source's raw format to a clean HAST tree.
3. The rest of the pipeline — transformers, renderers, orchestration, entry
   point — is unchanged.