const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  ROOT,
  PUBLIC_DIR,
  AUDIT_DIR,
  BASE_URL,
  REQUIRED_PATHS,
  ensureDir,
  ensureBaseDirs,
  toAbsoluteUrl,
  isSameSite,
  isLikelyAsset,
  normalizePathname,
  pageOutputPath,
  pageWebPath,
  stripHash,
  writeJson,
  settlePage,
  browserLaunchOptions
} = require("./recovery-utils");

const MAX_PAGES = 80;

function parseSrcset(value, base) {
  if (!value) return [];
  return value
    .split(",")
    .map(part => part.trim().split(/\s+/)[0])
    .map(raw => toAbsoluteUrl(raw, base))
    .filter(Boolean);
}

function looksLikeReference(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return false;
  return /^(https?:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    /\.(css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|mp4|webm|mov|mp3|wav|json|xml)(?:[?#].*)?$/i.test(trimmed);
}

function shouldCrawlPage(url) {
  if (!isSameSite(url)) return false;
  const u = new URL(url);
  const pathname = normalizePathname(u.pathname);
  if (pathname.includes("/wp-admin") || pathname.includes("/wp-login")) return false;
  if (pathname.includes("/wp-json")) return false;
  if (pathname.includes("/feed")) return false;
  if (isLikelyAsset(url)) return false;
  return true;
}

async function main() {
  ensureBaseDirs();
  const discoveredPages = new Map();
  const discoveredAssets = new Map();
  const failedRequests = [];
  const queue = REQUIRED_PATHS.map(p => new URL(p, BASE_URL).href);

  const browser = await chromium.launch(browserLaunchOptions());
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
  });

  while (queue.length && discoveredPages.size < MAX_PAGES) {
    const next = stripHash(queue.shift());
    if (discoveredPages.has(next)) continue;

    const page = await context.newPage();
    const responses = [];
    page.on("response", async response => {
      const req = response.request();
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()["content-type"] || "",
        resourceType: req.resourceType()
      });
    });
    page.on("requestfailed", request => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failure: request.failure() ? request.failure().errorText : "request failed",
        page: next
      });
    });

    try {
      await page.goto(next, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

      const finalUrl = stripHash(page.url());
      const title = await page.title().catch(() => "");
      const html = await page.content();
      const outFile = pageOutputPath(finalUrl);
      ensureDir(path.dirname(outFile));
      fs.writeFileSync(outFile, `<!DOCTYPE html>\n${html.replace(/^<!DOCTYPE html>\s*/i, "")}`, "utf8");

      const pagePath = pageWebPath(finalUrl);
      discoveredPages.set(finalUrl, {
        url: finalUrl,
        path: pagePath,
        title,
        localFile: path.relative(ROOT, outFile).replace(/\\/g, "/")
      });

      await settlePage(page);

      const domData = await page.evaluate(() => {
        const attrs = [
          "href",
          "src",
          "srcset",
          "data-src",
          "data-srcset",
          "data-bg",
          "data-background",
          "data-lazy-src",
          "data-lazy-srcset",
          "data-original",
          "poster",
          "content"
        ];
        const values = [];
        document.querySelectorAll("*").forEach(el => {
          attrs.forEach(attr => {
            const value = el.getAttribute(attr);
            if (value) values.push({ attr, value, tag: el.tagName.toLowerCase() });
          });
          const style = el.getAttribute("style");
          if (style) values.push({ attr: "style", value: style, tag: el.tagName.toLowerCase() });
        });
        return values;
      });

      for (const item of domData) {
        let urls = [];
        if (item.attr.toLowerCase().includes("srcset")) {
          urls = parseSrcset(item.value, finalUrl);
        } else if (item.attr === "style") {
          const matches = [...item.value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)];
          urls = matches.map(m => toAbsoluteUrl(m[2], finalUrl)).filter(Boolean);
        } else {
          if (!looksLikeReference(item.value)) continue;
          const abs = toAbsoluteUrl(item.value, finalUrl);
          if (abs) urls = [abs];
        }
        for (const url of urls) {
          const clean = stripHash(url);
          const mayBePageLink = item.attr === "href" && item.tag === "a";
          if (mayBePageLink && shouldCrawlPage(clean)) {
            if (!discoveredPages.has(clean) && !queue.includes(clean)) queue.push(clean);
          } else if (isLikelyAsset(clean) || /\.(css|js|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|gif|ico|pdf|mp4)$/i.test(new URL(clean).pathname)) {
            discoveredAssets.set(clean, { url: clean, referencedBy: finalUrl, source: `${item.tag}[${item.attr}]` });
          }
        }
      }

      for (const response of responses) {
        const clean = stripHash(response.url);
        const type = response.resourceType;
        if (type === "document") continue;
        if (["stylesheet", "script", "image", "font", "media", "fetch", "xhr"].includes(type) || isLikelyAsset(clean)) {
          discoveredAssets.set(clean, {
            url: clean,
            referencedBy: finalUrl,
            source: `network:${type}`,
            status: response.status,
            contentType: response.contentType
          });
        }
      }
    } catch (error) {
      failedRequests.push({
        url: next,
        method: "GET",
        resourceType: "document",
        failure: error.message,
        page: next
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const pages = [...discoveredPages.values()].sort((a, b) => a.path.localeCompare(b.path));
  const assets = [...discoveredAssets.values()].sort((a, b) => a.url.localeCompare(b.url));
  const state = { baseUrl: BASE_URL, crawledAt: new Date().toISOString(), pages, assets, failedRequests };
  writeJson(path.join(AUDIT_DIR, "crawl-state.json"), state);

  const pageLines = ["# Discovered URLs", "", "## Pages", "", ...pages.map(p => `- ${p.url} -> ${p.localFile}`), "", "## Asset/Resource URLs", "", ...assets.map(a => `- ${a.url} (${a.source || "unknown"})`), ""];
  fs.writeFileSync(path.join(AUDIT_DIR, "discovered-urls.md"), pageLines.join("\n"), "utf8");
  console.log(`Crawled ${pages.length} pages and discovered ${assets.length} assets/resources.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
