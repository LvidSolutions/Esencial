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

const SELECTORS = [
  ["header", ".css_header"],
  ["nav", ".css_nav_container"],
  ["logo", ".css_logo_svg"],
  ["tag filter", ".css_tag_item"],
  ["grid container", ".css_grid_container"],
  ["grid card", ".css_grid_card_container"],
  ["grid photo", ".css_grid_photo"],
  ["grid text", ".css_grid_text_container"],
  ["grid title", ".css_grid_text_name"],
  ["about text", ".css_about_text_container, .css_text_container"],
  ["first paragraph", "p"],
  ["footer", ".css_nav_footer_container"]
];

async function inspect(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await settlePage(page);
  return page.evaluate(selectors => {
    const out = {};
    for (const [label, selector] of selectors) {
      const el = document.querySelector(selector);
      if (!el) {
        out[label] = null;
        continue;
      }
      const rect = el.getBoundingClientRect();
      out[label] = {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2))
      };
    }
    return out;
  }, SELECTORS);
}

function delta(live, local) {
  if (!live || !local) return null;
  return {
    x: Number((local.x - live.x).toFixed(2)),
    y: Number((local.y - live.y).toFixed(2)),
    width: Number((local.width - live.width).toFixed(2)),
    height: Number((local.height - live.height).toFixed(2))
  };
}

async function main() {
  const state = readJson(path.join(AUDIT_DIR, "crawl-state.json"), { pages: [] });
  const paths = [...new Set([...REQUIRED_PATHS, ...state.pages.map(page => page.path)])];
  const server = await startStaticServer(3000);
  const browser = await chromium.launch(browserLaunchOptions());
  const rows = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, ignoreHTTPSErrors: true });
    for (const pagePath of paths) {
      const livePage = await context.newPage();
      const localPage = await context.newPage();
      const live = await inspect(livePage, new URL(pagePath, BASE_URL).href);
      const local = await inspect(localPage, new URL(pagePath, LOCAL_ORIGIN).href);
      await livePage.close();
      await localPage.close();

      for (const [label] of SELECTORS) {
        rows.push({ page: pagePath, element: label, live: live[label], local: local[label], delta: delta(live[label], local[label]) });
      }
    }
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  const report = [
    "# Bounding Box Report",
    "",
    "Compared key element x/y/width/height at 1440x1200. Delta is local minus live.",
    "",
    "| Page | Element | Live | Local | Delta |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(row => `| ${row.page} | ${row.element} | ${row.live ? JSON.stringify(row.live) : "missing"} | ${row.local ? JSON.stringify(row.local) : "missing"} | ${row.delta ? JSON.stringify(row.delta) : "n/a"} |`),
    ""
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "bounding-box-report.md"), report.join("\n"), "utf8");
  fs.writeFileSync(path.join(AUDIT_DIR, "bounding-box-report.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Bounding box comparisons written for ${rows.length} element/page pairs.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
