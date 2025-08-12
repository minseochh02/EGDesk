// @ts-nocheck
import { WordPressClient } from "..";

async function main(): Promise<void> {
  const siteUrl = process.env.WP_URL;
  const username = process.env.WP_USER;
  const applicationPassword = process.env.WP_APP_PASSWORD;
  const pageIdEnv = process.env.WP_PAGE_ID;
  const newTitle = process.env.WP_NEW_TITLE; // optional, not used in this minimal edit

  if (!siteUrl || !username || !applicationPassword) {
    console.error(
      "Missing required env vars. Please set WP_URL, WP_USER, WP_APP_PASSWORD"
    );
    process.exit(1);
  }
  if (!pageIdEnv) {
    console.error("Please set WP_PAGE_ID to the numeric page ID to edit.");
    process.exit(1);
  }
  const pageId = Number(pageIdEnv);
  if (Number.isNaN(pageId)) {
    console.error("WP_PAGE_ID must be a number.");
    process.exit(1);
  }

  const client = new WordPressClient({ siteUrl, username, applicationPassword });

  const page = await client.fetchPageById(pageId);
  console.log("Current page:", {
    id: page.id,
    status: page.status,
    title: page.title?.rendered,
    link: page.link,
  });

  const updatedHtml = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>Updated from Void</title></head><body><h1>Updated from Void</h1><p>Page ${pageId} updated at ${new Date().toISOString()}.</p></body></html>`;

  const updated = await client.updatePageContent(pageId, updatedHtml, page.status);
  console.log("Updated page:", { id: updated.id, link: updated.link, status: updated.status });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => {
  console.error(err);
  process.exit(1);
});


