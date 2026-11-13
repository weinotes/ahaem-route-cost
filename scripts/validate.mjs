import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const englishHtml = await readFile(join(dist, "index.html"), "utf8");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const robots = await readFile(join(dist, "robots.txt"), "utf8");
const seoProfile = JSON.parse(
  await readFile(join(root, "docs/seo-geo-profile.json"), "utf8"),
);

function matchOne(value, pattern, label) {
  const match = value.match(pattern);
  assert.ok(match, `Missing ${label}.`);
  return match[1];
}

const siteUrl = matchOne(
  englishHtml,
  /<link rel="canonical" href="(https?:\/\/[^"]+\/)">/,
  "English canonical URL",
);
const chineseUrl = new URL("zh-CN/", siteUrl).toString();
const pages = [
  {
    path: "index.html",
    lang: "en",
    title: "Crypto Transfer Cost Calculator | AHAEM Open Tools",
    canonical: siteUrl,
    minDescriptionLength: 80,
  },
  {
    path: "zh-CN/index.html",
    lang: "zh-CN",
    title: "加密货币转账成本计算器｜AHAEM 开放工具",
    canonical: chineseUrl,
    minDescriptionLength: 40,
  },
];

const titles = new Set();
const descriptions = new Set();

for (const page of pages) {
  const html = await readFile(join(dist, page.path), "utf8");
  assert.match(html, new RegExp(`<html lang="${page.lang}">`));
  assert.equal(
    (html.match(/<h1\b/g) || []).length,
    1,
    `Expected exactly one H1 in ${page.path}.`,
  );

  const title = matchOne(html, /<title>([^<]+)<\/title>/, "title");
  assert.equal(title, page.title, `Unexpected title in ${page.path}.`);
  assert.ok(!titles.has(title), `Duplicate title in ${page.path}.`);
  titles.add(title);

  const description = matchOne(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/,
    "meta description",
  );
  assert.ok(
    description.length >= page.minDescriptionLength,
    `Description is too short in ${page.path}.`,
  );
  assert.ok(
    !descriptions.has(description),
    `Duplicate description in ${page.path}.`,
  );
  descriptions.add(description);

  assert.match(html, /<meta name="robots" content="index,follow">/);
  const canonical = matchOne(
    html,
    /<link rel="canonical" href="([^"]+)">/,
    "canonical URL",
  );
  assert.equal(canonical, page.canonical, `Unexpected canonical in ${page.path}.`);

  const alternates = Object.fromEntries(
    [...html.matchAll(
      /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g,
    )].map(([, language, href]) => [language, href]),
  );
  assert.deepEqual(alternates, {
    en: siteUrl,
    "zh-CN": chineseUrl,
    "x-default": siteUrl,
  }, `Unexpected hreflang alternates in ${page.path}.`);

  assert.match(
    html,
    /<meta property="og:image" content="https?:\/\/[^"]+og-cover\.png">/,
  );
  assert.match(html, /https:\/\/www\.ahaem\.com\/tools\/route-cost\//);
  assert.match(html, /https:\/\/www\.cexah\.com\/tools\/trading-cost-comparison/);
  assert.doesNotMatch(
    html,
    /googletagmanager|google-analytics|facebook\.net\/tr|gtag\(/i,
  );
  assert.doesNotMatch(html, /referral_code=|\?ref=|affiliate_id=/i);

  const jsonLdBlocks = [...html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )];
  assert.ok(jsonLdBlocks.length > 0, `Expected JSON-LD in ${page.path}.`);
  for (const [, raw] of jsonLdBlocks) {
    JSON.parse(raw);
  }
  assert.match(html, /"@type": "WebApplication"/);
  assert.match(html, new RegExp(`"inLanguage": "${page.lang}"`));

  if (page.lang === "zh-CN") {
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    const hanCount = (visibleText.match(/\p{Script=Han}/gu) || []).length;
    const minimumHanCount =
      seoProfile.quality_gates.min_han_characters?.["zh-CN"] || 0;
    assert.ok(
      hanCount >= minimumHanCount,
      `Chinese visible content is too thin: ${hanCount} Han characters.`,
    );
  }
}

for (const asset of [
  "app.js",
  "calculator.js",
  "favicon.svg",
  "og-cover.png",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml",
  "styles.css",
  "zh-CN/index.html",
  "zh-CN/site.webmanifest",
]) {
  await stat(join(dist, asset));
}

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, loc]) => loc,
);
assert.deepEqual(sitemapUrls, [siteUrl, chineseUrl]);
assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
assert.equal((sitemap.match(/<xhtml:link /g) || []).length, 6);
assert.match(robots, /Sitemap: https?:\/\/[^\n]+sitemap\.xml/);

const files = await readdir(dist, { recursive: true });
let totalBytes = 0;
for (const file of files) {
  const fileStat = await stat(join(dist, file));
  if (fileStat.isFile()) totalBytes += fileStat.size;
}
assert.ok(totalBytes < 250_000, `Deployment is too large: ${totalBytes} bytes.`);
console.log(`Validation passed for 2 locales (${totalBytes} bytes).`);
