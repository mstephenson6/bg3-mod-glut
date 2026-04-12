# Site Build Architecture

This document captures the structural decisions for the `site/` build pipeline.
Its purpose is to keep future work focused: new documents, new output formats,
and new build steps should fit naturally into this structure rather than work
around it.

---

## Layer map

```
site/
  index.ts                  ← entry point: declares pipelines, runs them
  documents/
    spores.ts               ← per-document config (renderers + options)
  src/
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
(entry point → documents → src). No module in `src/` imports from `documents/`.

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
add it to the `renderers` array of the relevant document config. Nothing else
changes.

Renderers **must treat the HAST tree as read-only**. `stripStyles()` in
`src/hast.ts` removes all presentation data before the tree reaches any
renderer; renderers apply their own presentation layer and must not mutate the
shared tree.

### 2. A document is a `DocumentPipeline`: an ID and a list of renderers

```ts
interface DocumentPipeline {
  readonly documentId: string;
  readonly renderers: readonly Renderer[];
}
```

To add a second Google Doc, create a new file in `documents/`, export a
`DocumentPipeline` value, and call `runPipeline` once more in `index.ts`. The
two pipelines are fully independent and can run concurrently with `Promise.all`
if their output paths don't conflict.

All document-specific values — the Google Doc ID, `rehype-document` options,
`rehype-meta` options, output paths — live in that document's config file.
Nothing document-specific belongs in `src/`.

### 3. Assets are a build-level concern owned by the entry point

Asset copies are declared in `index.ts`, not inside any `DocumentPipeline`.
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
  └─ runPipeline(documentPipeline, { assets })        [src/pipeline.ts]
       │
       ├─ 1. fetchAndTransform(documentId)             [src/hast.ts]
       │       ├─ fetchDocument(documentId)            [src/google-docs.ts]
       │       │     └─ getAccessToken()               [src/auth.ts]
       │       ├─ googleDocToHast(doc)
       │       └─ stripStyles(tree)
       │
       ├─ 2. Promise.all(renderers.map(r => r.render(hast)))
       │       ├─ MarkdownRenderer.render(hast)        [src/renderers/markdown.ts]
       │       └─ HtmlRenderer.render(hast)            [src/renderers/html.ts]
       │
       └─ 3. cp(src, dest) for each AssetCopy
```

---

## How to extend

**Add a new output format for an existing document**
1. Create `src/renderers/<format>.ts` exporting a factory that returns a
   `Renderer`.
2. Import the factory in `documents/<doc>.ts` and add it to `renderers`.

**Add a new document**
1. Create `documents/<name>.ts` exporting a `DocumentPipeline`.
2. Import it in `index.ts` and call `runPipeline`.

**Add a new document source (not Google Docs)**
1. Create `src/<source>-client.ts` analogous to `src/google-docs.ts`.
2. Create a new ingest function analogous to `fetchAndTransform` in
   `src/hast.ts` that converts the source's raw format to a clean HAST tree.
3. The rest of the pipeline — renderers, orchestration, entry point — is
   unchanged.