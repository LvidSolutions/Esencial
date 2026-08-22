const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR, BASE_URL } = require("./recovery-utils");

const URLS = [
  "/", "/projects/", "/om-oss/", "/about/",
  ...fs.readdirSync(path.join(PUBLIC_DIR, "projekt"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `/projekt/${entry.name}/`),
  ...fs.readdirSync(path.join(PUBLIC_DIR, "projects"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `/projects/${entry.name}/`)
];

function fileForUrl(url) {
  return url === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, url.slice(1), "index.html");
}

function count(html, expression) {
  return (html.match(expression) || []).length;
}

const errors = [];
const summary = { pages: 0, projectPages: 0, corePages: 0, headings: 0 };

for (const url of URLS) {
  const html = fs.readFileSync(fileForUrl(url), "utf8");
  summary.pages += 1;
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => match[1].replace(/<[^>]+>/g, "").trim());
  summary.headings += h1s.length;
  if (h1s.length !== 1 || !h1s[0]) errors.push(`${url}: expected one non-empty h1; found ${h1s.length}.`);
  if (count(html, /<main\b/gi) !== 1 || count(html, /<\/main>/gi) !== 1) errors.push(`${url}: expected exactly one main landmark.`);
  if (count(html, /<header\b/gi) !== 1 || count(html, /<\/header>/gi) !== 1) errors.push(`${url}: expected exactly one header landmark.`);
  if (count(html, /<nav\b/gi) < 1) errors.push(`${url}: expected at least one navigation landmark.`);
  if (/<h[2-6]\b/gi.test(html) && !/<h1\b/gi.test(html)) errors.push(`${url}: lower-level heading has no h1 context.`);

  const isCorePage = ["/", "/projects/", "/om-oss/", "/about/"].includes(url);
  if (isCorePage) {
    summary.corePages += 1;
    if (!html.includes('data-semantic-core="true"')) errors.push(`${url}: core semantic normalization marker is missing.`);
    if (count(html, /<nav\b/gi) < 3) errors.push(`${url}: expected mobile, primary, and secondary navigation landmarks.`);
  } else {
    summary.projectPages += 1;
    if (count(html, /<footer\b/gi) !== 1 || count(html, /<\/footer>/gi) !== 1) errors.push(`${url}: expected exactly one footer landmark.`);
  }
}

if (errors.length) {
  console.error(`Semantic HTML validation failed (${errors.length} error(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Semantic HTML validation passed: ${summary.pages} pages (${summary.corePages} core, ${summary.projectPages} project), ${summary.headings} non-empty h1 elements, canonical base ${BASE_URL}.`);
