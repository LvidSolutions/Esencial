const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  AUDIT_DIR,
  BASE_URL,
  LOCAL_ORIGIN,
  REQUIRED_PATHS,
  readJson,
  startStaticServer,
  settlePage,
  browserLaunchOptions
} = require("./recovery-utils");

async function main() {
  const state = readJson(path.join(AUDIT_DIR, "crawl-state.json"), { pages: [] });
  const paths = [...new Set([...REQUIRED_PATHS, ...state.pages.map(page => page.path)])];
  const server = await startStaticServer(3000);
  const browser = await chromium.launch(browserLaunchOptions());
  const results = [];

  try {
    const context = await browser.newContext({ viewport: { width: 430, height: 932 }, ignoreHTTPSErrors: true });
    for (const pagePath of paths) {
      const page = await context.newPage();
      const errors = [];
      page.on("console", msg => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.goto(new URL(pagePath, LOCAL_ORIGIN).href, { waitUntil: "domcontentloaded", timeout: 45000 });
      await settlePage(page);
      const linkData = await page.evaluate(() => [...document.querySelectorAll("a[href]")]
        .map(a => ({ text: (a.textContent || a.getAttribute("aria-label") || "").trim(), href: a.href }))
        .filter(a => a.href && !a.href.startsWith("mailto:") && !a.href.startsWith("tel:"))
        .slice(0, 40));
      const internalLinks = linkData.filter(link => {
        try {
          const u = new URL(link.href);
          return u.origin === location.origin;
        } catch {
          return false;
        }
      });
      const checkedLinks = [];
      const explicitRoutes = ["/", "/om-oss/", "/projects/", "/about/"].map(route => ({
        href: new URL(route, LOCAL_ORIGIN).href,
        text: `route ${route}`
      }));
      const toCheck = [...explicitRoutes, ...internalLinks].filter((link, index, list) => list.findIndex(other => other.href === link.href) === index);
      for (const link of toCheck.slice(0, 16)) {
        const check = await context.newPage();
        let status = "ok";
        try {
          const response = await check.goto(link.href, { waitUntil: "domcontentloaded", timeout: 20000 });
          status = response ? `${response.status()}` : "no response";
        } catch (error) {
          status = error.message;
        }
        await check.close();
        checkedLinks.push({ href: link.href.replace(LOCAL_ORIGIN, ""), text: link.text, status });
      }
      const hover = await page.locator("a:visible").first().hover({ timeout: 5000 }).then(() => "first visible link hover ok").catch(error => error.message);
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      results.push({ page: pagePath, checkedLinks, hover, scrollHeight, consoleErrors: errors });
      await page.close();
    }
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  const report = [
    "# Functionality Report",
    "",
    "Local copy tested with Playwright at mobile viewport 430x932.",
    "",
    ...results.map(result => [
      `## ${result.page}`,
      "",
      `- Scroll height: ${result.scrollHeight}`,
      `- Hover state check: ${result.hover}`,
      `- Console errors: ${result.consoleErrors.length ? result.consoleErrors.join(" | ") : "none captured"}`,
      "- Internal navigation checks:",
      ...result.checkedLinks.map(link => `  - ${link.href || "/"} (${link.text || "untitled"}): ${link.status}`),
      ""
    ].join("\n"))
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "functionality-report.md"), report.join("\n"), "utf8");
  fs.writeFileSync(path.join(AUDIT_DIR, "functionality-report.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`Functionality checks written for ${results.length} pages.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
