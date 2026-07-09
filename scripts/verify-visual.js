const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  AUDIT_DIR,
  SCREENSHOT_DIR,
  BASE_URL,
  LOCAL_ORIGIN,
  REQUIRED_PATHS,
  VIEWPORTS,
  ensureDir,
  readJson,
  startStaticServer,
  settlePage,
  safeName,
  browserLaunchOptions
} = require("./recovery-utils");

async function main() {
  const state = readJson(path.join(AUDIT_DIR, "crawl-state.json"), { pages: [] });
  const crawledPaths = new Set(state.pages.map(page => page.path));
  const paths = [...new Set([...REQUIRED_PATHS, ...state.pages.map(page => page.path)])].filter(p => crawledPaths.has(p) || REQUIRED_PATHS.includes(p));

  ensureDir(path.join(SCREENSHOT_DIR, "live"));
  ensureDir(path.join(SCREENSHOT_DIR, "local"));
  const server = await startStaticServer(3000);
  const browser = await chromium.launch(browserLaunchOptions());
  const rows = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
      context.setDefaultNavigationTimeout(90000);
      for (const pagePath of paths) {
        const name = safeName(pagePath, viewport.name);
        const livePage = await context.newPage();
        await livePage.goto(new URL(pagePath, BASE_URL).href, { waitUntil: "domcontentloaded", timeout: 90000 });
        await settlePage(livePage);
        const liveFile = path.join(SCREENSHOT_DIR, "live", `${name}.png`);
        await livePage.screenshot({ path: liveFile, fullPage: true, animations: "disabled" });
        await livePage.close();

        const localPage = await context.newPage();
        await localPage.goto(new URL(pagePath, LOCAL_ORIGIN).href, { waitUntil: "domcontentloaded", timeout: 90000 });
        await settlePage(localPage);
        const localFile = path.join(SCREENSHOT_DIR, "local", `${name}.png`);
        await localPage.screenshot({ path: localFile, fullPage: true, animations: "disabled" });
        await localPage.close();

        rows.push({ page: pagePath, viewport: viewport.name, live: liveFile, local: localFile });
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  fs.writeFileSync(path.join(AUDIT_DIR, "visual-captures.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Captured ${rows.length} live/local screenshot pairs.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
