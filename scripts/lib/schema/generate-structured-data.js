const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR } = require("../../recovery-utils");
const { buildPageGraph, serializeStructuredData } = require("./entity-graph");

const CORE_PAGES = [
  { file: "index.html", pageType: "CollectionPage" },
  { file: path.join("projects", "index.html"), pageType: "CollectionPage" },
  { file: path.join("om-oss", "index.html"), pageType: "AboutPage" },
  { file: path.join("about", "index.html"), pageType: "AboutPage" }
];
const JSON_LD_PATTERN = /<script\b(?=[^>]*\btype\s*=\s*(["'])application\/ld\+json\1)[^>]*>[\s\S]*?<\/script>/gi;

function decodeHtml(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|apos|quot|lt|gt);/gi, (_, entity) => ({ amp: "&", apos: "'", quot: '"', lt: "<", gt: ">" }[entity.toLowerCase()]));
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? decodeHtml(match[2].trim()) : "";
}

function metadata(html, file) {
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || "";
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [])[0] || "";
  const title = decodeHtml(((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim());
  const metaTags = head.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = head.match(/<link\b[^>]*>/gi) || [];
  const description = attribute(metaTags.find((tag) => attribute(tag, "name").toLowerCase() === "description") || "", "content");
  const primaryImage = attribute(metaTags.find((tag) => attribute(tag, "property").toLowerCase() === "og:image") || "", "content");
  const canonicalUrl = attribute(linkTags.find((tag) => attribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical")) || "", "href");
  const language = attribute(htmlTag, "lang").toLowerCase();
  for (const [label, value] of Object.entries({ title, description, primaryImage, canonicalUrl, language })) {
    if (!value) throw new Error(`${file} is missing ${label}; structured data cannot be generated safely.`);
  }
  return { title, description, primaryImage, canonicalUrl, language };
}

function applyStructuredData(html, graph, file) {
  const matches = [...html.matchAll(JSON_LD_PATTERN)];
  if (matches.length > 1) throw new Error(`${file} contains ${matches.length} JSON-LD blocks; expected at most one.`);
  const newline = html.includes("\r\n") ? "\r\n" : "\n";
  const block = `<script type="application/ld+json">${newline}${serializeStructuredData(graph).replace(/\n/g, newline)}${newline}</script>`;
  if (matches.length === 1) return html.replace(JSON_LD_PATTERN, block);
  if (!/<\/head>/i.test(html)) throw new Error(`${file} has no closing head element.`);
  return html.replace(/<\/head>/i, `${block}${newline}</head>`);
}

function generateCorePages() {
  let changed = 0;
  for (const page of CORE_PAGES) {
    const file = path.join(PUBLIC_DIR, page.file);
    const original = fs.readFileSync(file, "utf8");
    const graph = buildPageGraph({ ...metadata(original, page.file), pageType: page.pageType });
    const next = applyStructuredData(original, graph, page.file);
    if (next === original) continue;
    fs.writeFileSync(file, next, "utf8");
    changed += 1;
  }
  console.log(`Generated shared structured-data graphs for ${CORE_PAGES.length} core pages; changed ${changed}.`);
  return changed;
}

if (require.main === module) generateCorePages();

module.exports = { CORE_PAGES, applyStructuredData, generateCorePages, metadata };
