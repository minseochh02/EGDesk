// @ts-nocheck
import path from "path";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { WordPressClient } from "..";

async function ensureSampleHtml(htmlFilePath: string): Promise<string> {
  if (existsSync(htmlFilePath)) return htmlFilePath;
  const sample = `<!doctype html><html><head><meta charset="utf-8"/><title>Void → WordPress</title></head><body><h1>Deployed from Void</h1><p>Sample page pushed via WordPressClient.</p></body></html>`;
  await writeFile(htmlFilePath, sample, { encoding: "utf-8" });
  return htmlFilePath;
}

async function main(): Promise<void> {
  const siteUrl = process.env.WP_URL;
  const username = process.env.WP_USER;
  const applicationPassword = process.env.WP_APP_PASSWORD;
  const title = process.env.WP_TITLE || "AI Generated Page";
  const htmlFileEnv = process.env.HTML_FILE;

  if (!siteUrl || !username || !applicationPassword) {
    console.error(
      "Missing required env vars. Please set WP_URL, WP_USER, WP_APP_PASSWORD"
    );
    process.exit(1);
  }

  const client = new WordPressClient({ siteUrl, username, applicationPassword });

  const ok = await client.testConnection();
  console.log(ok ? "Connected to WordPress." : "Failed to connect to WordPress.");
  if (!ok) process.exit(2);

  const htmlFilePath = await ensureSampleHtml(
    htmlFileEnv || path.join(__dirname, "sample.html")
  );

  const htmlContent = await readFile(htmlFilePath, { encoding: "utf-8" });
  const created = await client.createPageWithHTMLContent(title, htmlContent, "publish");
  console.log("Created page:", created);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => {
  console.error(err);
  process.exit(1);
});


