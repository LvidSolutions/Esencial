const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const AUDIT_DIR = path.join(ROOT, "audit");
const SCREENSHOT_DIR = path.join(ROOT, "screenshots");
const BASE_URL = "https://www.esencial.se";
const LOCAL_ORIGIN = process.env.LOCAL_ORIGIN || "http://127.0.0.1:3000";
const REQUIRED_PATHS = ["/", "/om-oss/", "/projects/", "/about/"];
const VIEWPORTS = [
  { name: "desktop-1440x1200", width: 1440, height: 1200 },
  { name: "desktop-1280x1000", width: 1280, height: 1000 },
  { name: "desktop-1024x900", width: 1024, height: 900 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-375x812", width: 375, height: 812 }
];

function browserLaunchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft\\Edge\\Application\\msedge.exe")
  ].filter(Boolean);
  const executablePath = candidates.find(candidate => fs.existsSync(candidate));
  return executablePath
    ? { headless: true, executablePath }
    : { headless: true };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureBaseDirs() {
  [
    PUBLIC_DIR,
    path.join(PUBLIC_DIR, "assets", "css"),
    path.join(PUBLIC_DIR, "assets", "js"),
    path.join(PUBLIC_DIR, "assets", "images"),
    path.join(PUBLIC_DIR, "assets", "fonts"),
    path.join(PUBLIC_DIR, "assets", "media"),
    path.join(PUBLIC_DIR, "assets", "original-paths"),
    path.join(ROOT, "scripts"),
    path.join(SCREENSHOT_DIR, "live"),
    path.join(SCREENSHOT_DIR, "local"),
    path.join(SCREENSHOT_DIR, "diff"),
    AUDIT_DIR
  ].forEach(ensureDir);
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "") return "/";
  let clean = pathname.split("#")[0];
  clean = clean.split("?")[0];
  if (!clean.startsWith("/")) clean = `/${clean}`;
  return clean;
}

function toAbsoluteUrl(value, base = BASE_URL) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return null;
  }
  try {
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

function isSameSite(url) {
  try {
    const u = new URL(url);
    return u.hostname === "www.esencial.se" || u.hostname === "esencial.se";
  } catch {
    return false;
  }
}

function isLikelyAsset(url) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    return /\.(css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|mp4|webm|mov|mp3|wav|json|xml)$/i.test(pathname) ||
      pathname.includes("/wp-content/") ||
      pathname.includes("/wp-includes/");
  } catch {
    return false;
  }
}

function pageOutputPath(pageUrlOrPath) {
  const u = pageUrlOrPath.startsWith("http") ? new URL(pageUrlOrPath) : null;
  let pathname = normalizePathname(u ? u.pathname : pageUrlOrPath);
  if (pathname === "/") return path.join(PUBLIC_DIR, "index.html");
  if (path.extname(pathname)) {
    return path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ""));
  }
  return path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ""), "index.html");
}

function pageWebPath(pageUrlOrPath) {
  const u = pageUrlOrPath.startsWith("http") ? new URL(pageUrlOrPath) : null;
  let pathname = normalizePathname(u ? u.pathname : pageUrlOrPath);
  if (pathname !== "/" && !pathname.endsWith("/") && !path.extname(pathname)) pathname += "/";
  return pathname;
}

function stripHash(url) {
  const u = new URL(url);
  u.hash = "";
  return u.href;
}

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function sanitizeSegment(value) {
  return decodeURIComponent(value || "")
    .replace(/[<>:"\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "") || "asset";
}

function extensionFromType(contentType) {
  const clean = (contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "text/css": ".css",
    "text/javascript": ".js",
    "application/javascript": ".js",
    "application/json": ".json",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "application/font-woff2": ".woff2",
    "application/pdf": ".pdf",
    "video/mp4": ".mp4"
  };
  return map[clean] || "";
}

function assetOutputForUrl(url, contentType = "") {
  const u = new URL(url);
  const sameSite = isSameSite(url);
  let pathname = decodeURIComponent(u.pathname || "/");
  let parts = pathname.split("/").filter(Boolean).map(sanitizeSegment);
  let filename = parts.pop() || `index-${hash(url)}`;
  if (!path.extname(filename)) filename += extensionFromType(contentType) || `-${hash(url)}`;
  if (u.search && !sameSite) {
    const ext = path.extname(filename);
    const base = filename.slice(0, filename.length - ext.length);
    filename = `${base}-${hash(u.search)}${ext}`;
  }
  const relParts = sameSite
    ? [...parts, filename]
    : ["assets", "original-paths", "external", sanitizeSegment(u.hostname), ...parts, filename];
  const rel = relParts.join("/");
  return {
    filePath: path.join(PUBLIC_DIR, rel),
    webPath: `/${rel.replace(/\\/g, "/")}`
  };
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function extractUrlsFromCss(css, cssUrl) {
  const found = new Set();
  const urlRe = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let match;
  while ((match = urlRe.exec(css))) {
    const raw = match[2].trim();
    const abs = toAbsoluteUrl(raw, cssUrl);
    if (abs) found.add(abs);
  }
  const importRe = /@import\s+(?:url\()?\s*(['"])(.*?)\1\s*\)?/gi;
  while ((match = importRe.exec(css))) {
    const abs = toAbsoluteUrl(match[2], cssUrl);
    if (abs) found.add(abs);
  }
  return [...found];
}

function loadAssetMap() {
  return readJson(path.join(AUDIT_DIR, "asset-map.json"), {});
}

function replacementForUrl(url, assetMap) {
  try {
    const noHash = stripHash(url);
    if (assetMap[url]) return assetMap[url].webPath;
    if (assetMap[noHash]) return assetMap[noHash].webPath;
    if (isSameSite(url)) {
      const u = new URL(url);
      return `${u.pathname}${u.search || ""}${u.hash || ""}`;
    }
  } catch {
    return null;
  }
  return null;
}

function startStaticServer(port = 3000) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4"
  };
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(reqUrl.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    let target = path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ""));
    if (!target.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      const indexTarget = path.join(target, "index.html");
      if (fs.existsSync(indexTarget)) target = indexTarget;
    }
    if (!fs.existsSync(target)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function settlePage(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y <= total; y += Math.max(350, Math.floor(window.innerHeight * 0.75))) {
      window.scrollTo(0, y);
      await delay(80);
    }
    window.scrollTo(0, 0);
    await delay(300);
  }).catch(() => {});
}

function safeName(pagePath, viewportName = "") {
  const base = pagePath === "/" ? "home" : pagePath.replace(/^\/|\/$/g, "").replace(/[\/\\]+/g, "__");
  return viewportName ? `${base}--${viewportName}` : base;
}

module.exports = {
  ROOT,
  PUBLIC_DIR,
  AUDIT_DIR,
  SCREENSHOT_DIR,
  BASE_URL,
  LOCAL_ORIGIN,
  REQUIRED_PATHS,
  VIEWPORTS,
  ensureDir,
  ensureBaseDirs,
  normalizePathname,
  toAbsoluteUrl,
  isSameSite,
  isLikelyAsset,
  pageOutputPath,
  pageWebPath,
  stripHash,
  assetOutputForUrl,
  readJson,
  writeJson,
  extractUrlsFromCss,
  loadAssetMap,
  replacementForUrl,
  startStaticServer,
  settlePage,
  safeName
  ,
  browserLaunchOptions
};
