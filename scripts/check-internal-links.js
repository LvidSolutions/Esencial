const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, pageOutputPath } = require("./recovery-utils");

function sitemapRoutes() {
  const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => new URL(match[1]).pathname);
}

function localTarget(raw, pageRoute) {
  if (!raw || /^(#|mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
  const url = new URL(raw, new URL(pageRoute, `${BASE_URL}/`));
  if (url.origin !== BASE_URL) return null;
  return url.pathname;
}

function fileForPathname(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || pathname.endsWith("/")) return path.join(PUBLIC_DIR, relative, "index.html");
  if (path.extname(relative)) return path.join(PUBLIC_DIR, relative);
  return path.join(PUBLIC_DIR, relative, "index.html");
}

function main() {
  const errors = [];
  const routes = sitemapRoutes();
  for (const route of routes) {
    const file = pageOutputPath(route);
    const html = fs.readFileSync(file, "utf8");
    const references = [...html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2]);
    for (const raw of references) {
      const target = localTarget(raw, route);
      if (target && !fs.existsSync(fileForPathname(target))) errors.push(`${route} -> ${target}`);
    }
  }
  if (errors.length) {
    console.error("Broken internal references:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Internal-link validation passed for ${routes.length} sitemap URLs.`);
}

main();
