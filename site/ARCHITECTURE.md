# Site Build Architecture

This document captures the structural decisions for the `site/` build pipeline.
Its purpose is to keep future work focused: new documents, new output formats,
and new build steps should fit naturally into this structure rather than work
around it.

---

## Layer map

```
site/
  index.ts                  ← entry point: reads documents.json, runs pipelines
  documents.json            ← document registry (add new docs here — no code required)
  src/
    config.ts               ← JSON config loader → DocumentPipeline[]
    types.ts                ← Renderer and DocumentPipeline interfaces
    auth.ts                 ← Google OAuth2 token resolution
    google-docs.ts          ← Google Docs REST API client
    hast.ts                 ← fetch → clean HAST tree (ingest phase)
    pipeline.ts             ← ingest → render → copy assets (orchestration)
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
  readonly renderers: readonly RendererConfig[];
}
```

`src/config.ts` maps each `DocumentConfig` to a `DocumentPipeline` via
`buildPipelinesFromConfig`, which resolves each renderer config
(`{ type: "markdown" | "html", ...options }`) to the appropriate `Renderer`
factory. Adding a new renderer type means adding a new member to the
`RendererConfig` union and a new `case` in `buildPipelinesFromConfig` —
nothing in the entry point or in any document data changes.

All document-specific values — the Google Doc ID, `rehype-document` options,
`rehype-meta` options, output paths — live in `documents.json`.
Nothing document-specific belongs in `src/`.

### 3. Assets are a build-level concern owned by the entry point

Asset copies are performed in `index.ts`, after all pipelines have settled.
Assets are typically shared across all documents in a build; if they lived
inside a pipeline config they would be copied once per document. The entry
point owns this step and is responsible for ensuring assets are only copied
once.

### 4. Auth and the API client are isolated from transformation

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
  │    └─ 2. Promise.all(renderers.map(r => r.render(hast)))
  │            ├─ MarkdownRenderer.render(hast)       [src/renderers/markdown.ts]
  │            └─ HtmlRenderer.render(hast)           [src/renderers/html.ts]
  │
  └─ cp("assets", "dist") once after all pipelines settle
```

---

## How to extend

**Add a new output format for an existing document**
1. Create `src/renderers/<format>.ts` exporting a factory that returns a
   `Renderer`.
2. Add a new member to the `RendererConfig` union in `src/config.ts` and a
   matching `case` to the `switch` in `buildPipelinesFromConfig`.
3. Add a renderer entry with `"type": "<format>"` to the relevant document
   in `documents.json`.

**Add a new document**
1. Add a new entry to `documents.json` with a `documentId` and a `renderers`
   array. No code is required — `src/config.ts` translates the JSON
   automatically.

**Add a new document source (not Google Docs)**
1. Create `src/<source>-client.ts` analogous to `src/google-docs.ts`.
2. Create a new ingest function analogous to `fetchAndTransform` in
   `src/hast.ts` that converts the source's raw format to a clean HAST tree.
3. The rest of the pipeline — renderers, orchestration, entry point — is
   unchanged.