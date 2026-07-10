const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, REQUIRED_PATHS, pageOutputPath } = require("./recovery-utils");

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function getHead(html) {
  return (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || "";
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2].trim() : "";
}

function tags(html, selector) {
  return html.match(selector) || [];
}

function expectedUrl(route) {
  return new URL(route, `${BASE_URL}/`).href;
}

function findLink(head, rel) {
  return tags(head, /<link\b[^>]*>/gi).find(tag => getAttribute(tag, "rel").toLowerCase() === rel);
}

function fail(errors, message) {
  errors.push(message);
}

function checkPage(route) {
  const file = pageOutputPath(route);
  const html = readFile(file);
  const head = getHead(html);
  const errors = [];
  const warnings = [];
  const title = (head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const description = tags(head, /<meta\b[^>]*>/gi)
    .find(tag => getAttribute(tag, "name").toLowerCase() === "description");
  const canonical = findLink(head, "canonical");
  const robots = tags(head, /<meta\b[^>]*>/gi)
    .filter(tag => getAttribute(tag, "name").toLowerCase() === "robots")
    .map(tag => getAttribute(tag, "content").toLowerCase());
  const alternateLinks = tags(head, /<link\b[^>]*>/gi)
    .filter(tag => getAttribute(tag, "rel").toLowerCase() === "alternate" && getAttribute(tag, "hreflang"));
  const jsonLdTags = tags(head, /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi);
  const images = tags(html, /<img\b[^>]*>/gi);
  const h1Count = tags(html, /<h1\b[^>]*>/gi).length;

  if (!title) fail(errors, "missing title");
  if (title && title.length > 60) warnings.push(`title is ${title.length} characters`);
  if (!description || !getAttribute(description, "content")) fail(errors, "missing meta description");
  if (!canonical) fail(errors, "missing canonical link");
  if (canonical && getAttribute(canonical, "href") !== expectedUrl(route)) {
    fail(errors, `canonical must be ${expectedUrl(route)}`);
  }
  if (h1Count !== 1) fail(errors, `expected one H1, found ${h1Count}`);
  if (robots.some(value => /\b(noindex|nofollow|nosnippet)\b/.test(value))) {
    fail(errors, "contains a blocking robots directive");
  }
  if (alternateLinks.length < 2) fail(errors, "missing Swedish and English hreflang links");
  if (!jsonLdTags.length) fail(errors, "missing JSON-LD in head");
  for (const tag of jsonLdTags) {
    const json = tag.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      JSON.parse(json);
    } catch {
      fail(errors, "contains invalid JSON-LD");
    }
  }
  for (const image of images) {
    if (!/\balt\s*=/.test(image)) fail(errors, "image without alt attribute");
  }

  return { route, file: path.relative(PUBLIC_DIR, file) || "index.html", errors, warnings };
}

function checkRobotsAndSitemap() {
  const errors = [];
  const robots = readFile(path.join(PUBLIC_DIR, "robots.txt"));
  const sitemap = readFile(path.join(PUBLIC_DIR, "sitemap.xml"));

  if (!/^User-agent:\s*\*/im.test(robots) || !/^Allow:\s*\//im.test(robots)) {
    fail(errors, "robots.txt must allow public crawling");
  }
  if (!new RegExp(`Sitemap:\\s*${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`, "i").test(robots)) {
    fail(errors, "robots.txt must reference the canonical sitemap URL");
  }
  for (const route of REQUIRED_PATHS) {
    if (!sitemap.includes(`<loc>${expectedUrl(route)}</loc>`)) {
      fail(errors, `sitemap is missing ${expectedUrl(route)}`);
    }
  }
  return errors;
}

function main() {
  const results = REQUIRED_PATHS.map(checkPage);
  const sharedErrors = checkRobotsAndSitemap();
  const errors = [...sharedErrors, ...results.flatMap(result => result.errors.map(error => `${result.route}: ${error}`))];
  const warnings = results.flatMap(result => result.warnings.map(warning => `${result.route}: ${warning}`));

  for (const result of results) {
    const state = result.errors.length ? "FAIL" : "OK";
    console.log(`${state} ${result.route} (${result.file})`);
  }
  for (const warning of warnings) console.warn(`WARN ${warning}`);

  if (errors.length) {
    console.error("\nSEO validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("\nSEO validation passed.");
}

main();
