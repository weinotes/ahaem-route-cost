import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(root, "site");
const outputDirectory = join(root, "dist");
const defaultSiteUrl = "http://127.0.0.1:4173/";

function normalizedSiteUrl(raw) {
  const value = raw || defaultSiteUrl;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("SITE_URL must use HTTP or HTTPS.");
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

const siteUrl = normalizedSiteUrl(process.env.SITE_URL);
const lastModified = process.env.SITE_LASTMOD || "2026-11-14";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

const indexPath = join(outputDirectory, "index.html");
const indexHtml = (await readFile(indexPath, "utf8")).replaceAll(
  "__SITE_URL__",
  siteUrl,
);
await writeFile(indexPath, indexHtml);

await writeFile(
  join(outputDirectory, "sitemap.xml"),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${siteUrl}</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n"),
);

await writeFile(
  join(outputDirectory, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("sitemap.xml", siteUrl).toString()}`,
    "",
  ].join("\n"),
);

console.log(`Built ${outputDirectory} for ${siteUrl}`);
