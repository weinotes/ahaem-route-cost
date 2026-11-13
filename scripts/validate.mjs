import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const html = await readFile(join(dist, "index.html"), "utf8");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const robots = await readFile(join(dist, "robots.txt"), "utf8");

assert.equal((html.match(/<h1\b/g) || []).length, 1, "Expected exactly one H1.");
assert.match(html, /<title>Crypto Transfer Cost Calculator \| AHAEM Open Tools<\/title>/);
assert.match(html, /<meta\s+name="description"\s+content="[^"]{80,}"/);
assert.match(html, /<meta name="robots" content="index,follow">/);
assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/">/);
assert.match(html, /https:\/\/www\.ahaem\.com\/tools\/route-cost\//);
assert.match(html, /https:\/\/www\.cexah\.com\/tools\/trading-cost-comparison/);
assert.doesNotMatch(html, /googletagmanager|google-analytics|facebook\.net\/tr|gtag\(/i);
assert.doesNotMatch(html, /referral_code=|\?ref=|affiliate_id=/i);

const jsonLdBlocks = [...html.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)];
assert.ok(jsonLdBlocks.length > 0, "Expected JSON-LD.");
for (const [, raw] of jsonLdBlocks) {
  JSON.parse(raw);
}
assert.match(html, /"@type": "WebApplication"/);

for (const asset of [
  "app.js",
  "calculator.js",
  "favicon.svg",
  "og-cover.png",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml",
  "styles.css",
]) {
  await stat(join(dist, asset));
}

assert.match(sitemap, /<loc>https?:\/\/[^<]+\/<\/loc>/);
assert.match(robots, /Sitemap: https?:\/\/[^\n]+sitemap\.xml/);

const files = await readdir(dist);
const totalBytes = (
  await Promise.all(
    files.map(async (file) => {
      const fileStat = await stat(join(dist, file));
      return fileStat.isFile() ? fileStat.size : 0;
    }),
  )
).reduce((total, size) => total + size, 0);

assert.ok(totalBytes < 250_000, `Deployment is too large: ${totalBytes} bytes.`);
console.log(`Validation passed (${totalBytes} bytes).`);
