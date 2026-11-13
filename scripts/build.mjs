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
const chineseSiteUrl = new URL("zh-CN/", siteUrl).toString();
const lastModified = process.env.SITE_LASTMOD || "2026-11-14";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

for (const pagePath of ["index.html", "zh-CN/index.html"]) {
  const pageAbsolutePath = join(outputDirectory, pagePath);
  const pageHtml = (await readFile(pageAbsolutePath, "utf8")).replaceAll(
    "__SITE_URL__",
    siteUrl,
  );
  await writeFile(pageAbsolutePath, pageHtml);
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sitemapEntry(loc) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(siteUrl)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeXml(chineseSiteUrl)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(siteUrl)}"/>`,
    `    <lastmod>${lastModified}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
  ];
}

await writeFile(
  join(outputDirectory, "sitemap.xml"),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...sitemapEntry(siteUrl),
    ...sitemapEntry(chineseSiteUrl),
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

console.log(`Built ${outputDirectory} for ${siteUrl} (en, zh-CN)`);
