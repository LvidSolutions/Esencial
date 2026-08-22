const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, REQUIRED_PATHS, ROOT, pageOutputPath } = require("./recovery-utils");

const CANONICAL_ORIGIN = new URL(BASE_URL).origin;
const STAGING_HOST_PATTERN = /(?:localhost|127\.0\.0\.1|\.vercel\.app|\.netlify\.app)$/i;

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

function relIncludes(tag, value) {
  return getAttribute(tag, "rel").toLowerCase().split(/\s+/).includes(value);
}

function expectedUrl(route) {
  return new URL(route, `${BASE_URL}/`).href;
}

function canonicalRoute(route) {
  if (route === "/") return route;
  return route.endsWith("/") ? route : `${route}/`;
}

function routeFromHtmlFile(file) {
  const relative = path.relative(PUBLIC_DIR, file).replace(/\\/g, "/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\/index\.html$/i, "/")}`;
}

function discoverHtmlFiles(directory = PUBLIC_DIR) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverHtmlFiles(target);
    return entry.isFile() && entry.name.toLowerCase() === "index.html" ? [target] : [];
  });
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function fail(errors, message) {
  errors.push(message);
}

function validatePublicUrl(value, label, errors) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(errors, `${label} is not an absolute URL: ${value}`);
    return null;
  }
  if (url.origin !== CANONICAL_ORIGIN) fail(errors, `${label} uses non-canonical origin ${url.origin}`);
  if (url.protocol !== "https:") fail(errors, `${label} must use HTTPS`);
  if (url.username || url.password || url.search || url.hash) fail(errors, `${label} must not contain credentials, a query, or a fragment`);
  if (STAGING_HOST_PATTERN.test(url.hostname)) fail(errors, `${label} exposes a staging or local host`);
  if (url.pathname !== "/" && !url.pathname.endsWith("/")) fail(errors, `${label} must use a trailing slash`);
  if (/\/{2,}/.test(url.pathname)) fail(errors, `${label} contains a duplicate slash`);
  if (url.pathname !== url.pathname.toLowerCase()) fail(errors, `${label} contains uppercase path characters`);
  return url;
}

function checkPage(route, sitemapUrls) {
  const file = pageOutputPath(route);
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(file)) {
    fail(errors, "mapped HTML file does not exist");
    return { route, file: path.relative(PUBLIC_DIR, file), canonical: "", indexable: false, errors, warnings };
  }

  const html = readFile(file);
  const head = getHead(html);
  const title = (head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const metaTags = tags(head, /<meta\b[^>]*>/gi);
  const description = metaTags.find(tag => getAttribute(tag, "name").toLowerCase() === "description");
  const canonicalLinks = tags(head, /<link\b[^>]*>/gi).filter(tag => relIncludes(tag, "canonical"));
  const robotTags = metaTags.filter(tag => getAttribute(tag, "name").toLowerCase() === "robots");
  const robotValues = robotTags.map(tag => getAttribute(tag, "content").toLowerCase());
  const xRobotsMeta = metaTags.filter(tag => getAttribute(tag, "http-equiv").toLowerCase() === "x-robots-tag");
  const alternateLinks = tags(head, /<link\b[^>]*>/gi)
    .filter(tag => relIncludes(tag, "alternate") && getAttribute(tag, "hreflang"));
  const jsonLdTags = tags(head, /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi);
  const images = tags(html, /<img\b[^>]*>/gi);
  const h1Count = tags(html, /<h1\b[^>]*>/gi).length;
  const blockingRobots = robotValues.some(value => /\b(noindex|nofollow|nosnippet)\b/.test(value));
  const canonical = canonicalLinks.length === 1 ? getAttribute(canonicalLinks[0], "href") : "";

  if (!title) fail(errors, "missing title");
  if (title && title.length > 60) warnings.push(`title is ${title.length} characters`);
  if (!description || !getAttribute(description, "content")) fail(errors, "missing meta description");
  if (canonicalLinks.length !== 1) fail(errors, `expected one canonical link, found ${canonicalLinks.length}`);
  if (canonical) {
    validatePublicUrl(canonical, "canonical", errors);
    if (canonical !== expectedUrl(route)) fail(errors, `canonical must be ${expectedUrl(route)}`);
  }
  if (h1Count !== 1) fail(errors, `expected one H1, found ${h1Count}`);
  if (robotTags.length > 1) fail(errors, `expected at most one robots meta tag, found ${robotTags.length}`);
  if (blockingRobots) fail(errors, "contains a blocking robots directive");
  if (xRobotsMeta.length) fail(errors, "contains an HTML X-Robots-Tag equivalent");
  if (alternateLinks.length < 2) fail(errors, "missing Swedish and English hreflang links");
  for (const alternate of alternateLinks) {
    const href = getAttribute(alternate, "href");
    const alternateUrl = validatePublicUrl(href, `hreflang ${getAttribute(alternate, "hreflang")}`, errors);
    if (alternateUrl && !fs.existsSync(pageOutputPath(alternateUrl.pathname))) {
      fail(errors, `hreflang target does not exist: ${href}`);
    }
    if (alternateUrl && !sitemapUrls.has(alternateUrl.href)) {
      fail(errors, `hreflang target is not in sitemap: ${href}`);
    }
  }
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

  return {
    route,
    file: path.relative(PUBLIC_DIR, file).replace(/\\/g, "/") || "index.html",
    canonical,
    indexable: !blockingRobots,
    errors,
    warnings
  };
}

function checkRobots() {
  const errors = [];
  const file = path.join(PUBLIC_DIR, "robots.txt");
  if (!fs.existsSync(file)) return { errors: ["robots.txt does not exist"] };
  const robots = readFile(file);
  const sitemapLines = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(match => match[1]);
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S.*)?$/gim)].map(match => (match[1] || "").trim()).filter(Boolean);
  if (!/^User-agent:\s*\*\s*$/im.test(robots)) fail(errors, "robots.txt must contain a wildcard user-agent group");
  if (!/^Allow:\s*\/\s*$/im.test(robots)) fail(errors, "robots.txt must allow the public site root");
  if (disallows.length) fail(errors, `robots.txt unexpectedly blocks paths: ${disallows.join(", ")}`);
  if (/^Noindex:/im.test(robots)) fail(errors, "robots.txt contains unsupported Noindex directives");
  if (sitemapLines.length !== 1 || sitemapLines[0] !== `${BASE_URL}/sitemap.xml`) {
    fail(errors, `robots.txt must declare exactly ${BASE_URL}/sitemap.xml`);
  }
  return { errors, sitemapLines };
}

function checkSitemap() {
  const errors = [];
  const file = path.join(PUBLIC_DIR, "sitemap.xml");
  if (!fs.existsSync(file)) return { errors: ["sitemap.xml does not exist"], urls: [], routes: [] };
  const xml = readFile(file);
  if (!/^<\?xml\s+version=["']1\.0["']\s+encoding=["']UTF-8["']\?>/i.test(xml.trim())) {
    fail(errors, "sitemap.xml must begin with a UTF-8 XML declaration");
  }
  if (!/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["'][^>]*>/i.test(xml)) {
    fail(errors, "sitemap.xml is missing the sitemap protocol namespace");
  }
  if (!/<\/urlset>\s*$/i.test(xml)) fail(errors, "sitemap.xml does not close its urlset");
  if (/<(?:sitemapindex|image:image)\b/i.test(xml)) fail(errors, "sitemap.xml contains an unexpected sitemap index or image extension");

  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => decodeXml(match[1]));
  if (!urls.length) fail(errors, "sitemap.xml does not contain any URLs");
  if (new Set(urls).size !== urls.length) fail(errors, "sitemap.xml contains duplicate URLs");
  const routes = [];
  for (const value of urls) {
    const url = validatePublicUrl(value, "sitemap URL", errors);
    if (!url) continue;
    routes.push(url.pathname);
    if (!fs.existsSync(pageOutputPath(url.pathname))) fail(errors, `sitemap target does not exist: ${value}`);
  }

  const lastmods = [...xml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/gi)].map(match => match[1]);
  for (const lastmod of lastmods) {
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(lastmod)) {
      fail(errors, `invalid sitemap lastmod: ${lastmod}`);
    }
  }
  if (lastmods.length && lastmods.length !== urls.length) fail(errors, "lastmod must be present for every URL or omitted entirely");
  return { errors, urls, routes, lastmodCount: lastmods.length };
}

function checkVercelConfig() {
  const errors = [];
  const file = path.join(ROOT, "vercel.json");
  let config;
  try {
    config = JSON.parse(readFile(file));
  } catch {
    return { errors: ["vercel.json is missing or invalid JSON"] };
  }
  if (config.trailingSlash !== true) fail(errors, "vercel.json must enforce trailingSlash: true");
  if (config.cleanUrls === true) fail(errors, "cleanUrls conflicts with the directory-based canonical URL contract");
  const originRedirect = (config.redirects || []).find(redirect =>
    redirect.destination === "https://www.esencial.se/:path*" &&
    redirect.permanent === true &&
    (redirect.has || []).some(condition => condition.type === "host" && condition.value === "esencial.se")
  );
  if (!originRedirect) fail(errors, "vercel.json must permanently redirect esencial.se to the canonical www origin");
  const previewHeader = (config.headers || []).find(rule =>
    rule.source === "/:path*" &&
    (rule.has || []).some(condition => condition.type === "host" && condition.value === ".*\\.vercel\\.app") &&
    (rule.headers || []).some(header => header.key.toLowerCase() === "x-robots-tag" && /\bnoindex\b/i.test(header.value))
  );
  if (!previewHeader) fail(errors, "vercel.json must send X-Robots-Tag: noindex for vercel.app previews");
  const apiHeader = (config.headers || []).find(rule =>
    rule.source === "/api/:path*" &&
    (rule.headers || []).some(header => header.key.toLowerCase() === "x-robots-tag" && /\bnoindex\b/i.test(header.value))
  );
  if (!apiHeader) fail(errors, "vercel.json must send X-Robots-Tag: noindex for API routes");
  return { errors };
}

function evidencePath() {
  const index = process.argv.indexOf("--evidence");
  if (index === -1) return null;
  if (!process.argv[index + 1]) throw new Error("--evidence requires an output path");
  return path.resolve(ROOT, process.argv[index + 1]);
}

function writeEvidence(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const sitemap = checkSitemap();
  const sitemapUrls = new Set(sitemap.urls);
  const robots = checkRobots();
  const vercel = checkVercelConfig();
  const discoveredRoutes = discoverHtmlFiles().map(routeFromHtmlFile).sort();
  const routes = [...new Set([...REQUIRED_PATHS, ...sitemap.routes, ...discoveredRoutes])].sort();
  const results = routes.map(route => checkPage(canonicalRoute(route), sitemapUrls));
  const errors = [
    ...robots.errors.map(error => `robots.txt: ${error}`),
    ...sitemap.errors.map(error => `sitemap.xml: ${error}`),
    ...vercel.errors.map(error => `vercel.json: ${error}`),
    ...results.flatMap(result => result.errors.map(error => `${result.route}: ${error}`))
  ];
  const warnings = results.flatMap(result => result.warnings.map(warning => `${result.route}: ${warning}`));
  const indexableRoutes = results.filter(result => result.indexable).map(result => result.route).sort();
  const sitemapRoutes = [...new Set(sitemap.routes.map(canonicalRoute))].sort();
  const missingFromSitemap = indexableRoutes.filter(route => !sitemapRoutes.includes(route));
  const nonIndexableInSitemap = sitemapRoutes.filter(route => !indexableRoutes.includes(route));
  const duplicateCanonicals = [...results.reduce((map, result) => {
    if (result.canonical) map.set(result.canonical, [...(map.get(result.canonical) || []), result.route]);
    return map;
  }, new Map()).entries()].filter(([, canonicalRoutes]) => canonicalRoutes.length > 1);

  for (const route of missingFromSitemap) fail(errors, `${route}: indexable HTML page is missing from sitemap.xml`);
  for (const route of nonIndexableInSitemap) fail(errors, `${route}: sitemap URL is not an indexable HTML page`);
  for (const [canonical, canonicalRoutes] of duplicateCanonicals) {
    fail(errors, `${canonical}: duplicate canonical used by ${canonicalRoutes.join(", ")}`);
  }

  for (const result of results) {
    const state = result.errors.length ? "FAIL" : "OK";
    console.log(`${state} ${result.route} (${result.file})`);
  }
  for (const warning of warnings) console.warn(`WARN ${warning}`);

  const evidence = {
    status: errors.length ? "failed" : "passed",
    canonicalOrigin: CANONICAL_ORIGIN,
    canonicalPolicy: "lowercase HTTPS www URLs with a trailing slash except the site root",
    counts: {
      discoveredHtmlPages: discoveredRoutes.length,
      checkedRoutes: results.length,
      indexablePages: indexableRoutes.length,
      sitemapUrls: sitemap.urls.length,
      sitemapLastmods: sitemap.lastmodCount || 0,
      uniqueCanonicals: new Set(results.map(result => result.canonical).filter(Boolean)).size,
      warnings: warnings.length,
      errors: errors.length
    },
    checks: {
      robots: robots.errors.length === 0,
      sitemap: sitemap.errors.length === 0,
      vercelRouting: vercel.errors.length === 0,
      exactIndexableSitemapSet: missingFromSitemap.length === 0 && nonIndexableInSitemap.length === 0,
      uniqueCanonicals: duplicateCanonicals.length === 0,
      pageChecks: results.every(result => result.errors.length === 0)
    },
    routes: results.map(result => ({ route: result.route, canonical: result.canonical, indexable: result.indexable })),
    warnings,
    errors
  };
  const output = evidencePath();
  if (output) {
    writeEvidence(output, evidence);
    console.log(`Technical SEO evidence written to ${path.relative(ROOT, output).replace(/\\/g, "/")}.`);
  }

  if (errors.length) {
    console.error("\nSEO validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`\nSEO validation passed: ${indexableRoutes.length} indexable pages, ${sitemap.urls.length} sitemap URLs, ${new Set(results.map(result => result.canonical)).size} unique canonicals.`);
}

main();
