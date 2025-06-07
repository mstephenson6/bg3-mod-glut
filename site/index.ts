import "dotenv/config";

import { unified } from "unified";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toHast } from "@googleworkspace/google-docs-hast";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";

import { cp, writeFile } from "node:fs/promises";
import { sporesDocId, sporesDocOpts, sporesMetaOpts } from "./options.ts";
import rehypeMeta from "rehype-meta";

const accessToken = async () => {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }
  const { access_token } = await grantTokens();
  return access_token;
};

const grantTokens = async () => {
  const grant_type = "refresh_token";
  const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const endpoint = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    grant_type,
    refresh_token,
    client_id,
    client_secret,
  });
  const method = "POST";
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const request = new Request(endpoint, { method, headers, body });
  return fetch(request).then((response) => response.json());
};

const documentsGet = async (documentId: string) => {
  const endpoint = "https://docs.googleapis.com/v1/documents";
  const url = `${endpoint}/${documentId}`;
  const headers = { Authorization: `Bearer ${await accessToken()}` };
  const request = new Request(url, { headers });
  return fetch(request).then((response) => response.json());
};

const toCleanHast = async (documentId: string) => {
  const doc = await documentsGet(documentId);
  const tree = toHast(doc);
  visit(tree, undefined, (node, index, parent) => {
    const { properties } = node;
    if (!properties) {
      return;
    }
    delete properties["className"];
    delete properties["style"];
  });
  return tree;
};

const main = async () => {
  const HTML_OUTPUT = "dist/index.html";
  const ASSETS_SRC_DIR = "assets";
  const ASSETS_DEST_DIR = "dist";
  const MARKDOWN_OUTPUT = "../README.md";

  const cleanHast = await toCleanHast(sporesDocId);

  const mdast = toMdast(cleanHast);
  const markdown = toMarkdown(mdast);
  await writeFile(MARKDOWN_OUTPUT, markdown);
  console.debug(`Wrote ${MARKDOWN_OUTPUT}`);

  await cp(ASSETS_SRC_DIR, ASSETS_DEST_DIR, { recursive: true });
  console.debug(`Copied ${ASSETS_SRC_DIR} to ${ASSETS_DEST_DIR}`);

  const { children } = cleanHast;
  const outputHast = await unified()
    .use(rehypeDocument, sporesDocOpts)
    .use(rehypeMeta, sporesMetaOpts)
    .use(rehypeFormat)
    .run({
      type: "root",
      children: [
        {
          type: "element",
          tagName: "header",
          properties: {},
          children: [],
        },
        {
          type: "element",
          tagName: "main",
          properties: {},
          children,
        },
        {
          type: "element",
          tagName: "footer",
          properties: {},
          children: [],
        },
      ],
    });
  const html = unified().use(rehypeStringify).stringify(outputHast);
  await writeFile(HTML_OUTPUT, html);
  console.debug(`Wrote ${HTML_OUTPUT}`);
};

await main();
