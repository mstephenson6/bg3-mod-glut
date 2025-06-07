import "dotenv/config";

import { unified } from "unified";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import { CONTINUE, EXIT, SKIP, visit } from "unist-util-visit";
import { reporter } from "vfile-reporter";
import { toHast } from "@googleworkspace/google-docs-hast";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";

import { writeFile } from "node:fs/promises";

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
  const MARKDOWN_OUTPUT = "../README.md";
  const SITE_INDEX_DOCUMENT_ID = "11nWtOTEWcI_TEt8WE1vfS3_NsWLIDIK01ClhKDgmJiY";
  const cleanHast = await toCleanHast(SITE_INDEX_DOCUMENT_ID);
  const mdast = toMdast(cleanHast);
  const markdown = toMarkdown(mdast);
  await writeFile(MARKDOWN_OUTPUT, markdown);
};

await main();
