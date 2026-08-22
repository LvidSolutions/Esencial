const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  ROOT,
  BASE_URL,
  LOCAL_ORIGIN,
  REQUIRED_PATHS,
  VIEWPORTS,
  ensureDir,
  startStaticServer,
  settlePage,
  browserLaunchOptions
} = require("./recovery-utils");

const OUTPUT_DIR = path.join(ROOT, "audit", "seo-final");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "stage-1-parity-evidence.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "stage-1-parity-evidence.md");
const BOX_SELECTORS = {
  header: ".css_header",
  navigation: ".css_nav_container",
  logo: ".css_logo_svg",
  filters: ".css_tag_container",
  grid: ".css_grid_container",
  firstCard: ".css_grid_card_container",
  aboutContent: ".css_about_wrapper, .css_about_container, .css_text_container",
  footer: ".css_nav_footer_container"
};
const STYLE_SELECTORS = {
  body: "body",
  header: ".css_header",
  navigation: ".css_nav_container",
  logo: ".css_logo_svg",
  filter: ".css_tag_item",
  grid: ".css_grid_container",
  card: ".css_grid_card_container",
  cardText: ".css_grid_text_container",
  footer: ".css_nav_footer_container"
};
const STYLE_PROPERTIES = [
  "display", "position", "width", "height", "margin", "padding",
  "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
  "color", "background-color", "opacity", "transform", "transition"
];
const BOX_TOLERANCE_PX = 0.75;

function sanitizeConsoleMessage(message, origin) {
  return message.replaceAll(origin, "<origin>");
}

function compareBoxes(live, local) {
  const differences = [];
  for (const key of Object.keys(BOX_SELECTORS)) {
    if (!live[key] && !local[key]) continue;
    if (!live[key] || !local[key]) {
      differences.push(`${key}: ${live[key] ? "live only" : "local only"}`);
      continue;
    }
    for (const prop of ["x", "y", "width", "height"]) {
      const delta = Number((local[key][prop] - live[key][prop]).toFixed(2));
      if (Math.abs(delta) > BOX_TOLERANCE_PX) differences.push(`${key}.${prop}: ${delta}px`);
    }
  }
  return differences;
}

function compareStyles(live, local) {
  const differences = [];
  for (const key of Object.keys(STYLE_SELECTORS)) {
    if (!live[key] && !local[key]) continue;
    if (!live[key] || !local[key]) {
      differences.push(`${key}: ${live[key] ? "live only" : "local only"}`);
      continue;
    }
    for (const prop of STYLE_PROPERTIES) {
      if (live[key][prop] !== local[key][prop]) {
        differences.push(`${key}.${prop}: live ${JSON.stringify(live[key][prop])}, local ${JSON.stringify(local[key][prop])}`);
      }
    }
  }
  return differences;
}

async function inspectPage(page, url, consoleErrors) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await settlePage(page);
  return page.evaluate(({ boxSelectors, styleSelectors, styleProperties }) => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return Object.fromEntries(["x", "y", "width", "height"].map(key => [key, Number(value[key].toFixed(2))]));
    };
    const styles = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      return Object.fromEntries(styleProperties.map(key => [key, computed.getPropertyValue(key)]));
    };
    return {
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      cardCount: document.querySelectorAll(".css_grid_card_container").length,
      filterLabels: [...document.querySelectorAll(".css_tag_item")].map(element => element.textContent.trim()),
      navigationLabels: [...document.querySelectorAll(".css_nav_container a")].map(element => element.textContent.trim()).filter(Boolean),
      gridImageRendering: (() => {
        const item = document.querySelector(".css_grid_photo_item");
        const image = item?.querySelector('img[data-seo-image="grid"]');
        return item ? {
          backgroundSize: getComputedStyle(item).backgroundSize,
          semanticImageObjectFit: image ? getComputedStyle(image).objectFit : null
        } : null;
      })(),
      boxes: Object.fromEntries(Object.entries(boxSelectors).map(([key, selector]) => [key, rect(selector)])),
      styles: Object.fromEntries(Object.entries(styleSelectors).map(([key, selector]) => [key, styles(selector)]))
    };
  }, { boxSelectors: BOX_SELECTORS, styleSelectors: STYLE_SELECTORS, styleProperties: STYLE_PROPERTIES }).then(result => ({ ...result, consoleErrors }));
}

async function inspectPair(context, pagePath) {
  const livePage = await context.newPage();
  const localPage = await context.newPage();
  const liveErrors = [];
  const localErrors = [];
  livePage.on("console", message => {
    if (message.type() === "error") liveErrors.push(sanitizeConsoleMessage(message.text(), BASE_URL));
  });
  localPage.on("console", message => {
    if (message.type() === "error") localErrors.push(sanitizeConsoleMessage(message.text(), LOCAL_ORIGIN));
  });
  try {
    const [live, local] = await Promise.all([
      inspectPage(livePage, new URL(pagePath, BASE_URL).href, liveErrors),
      inspectPage(localPage, new URL(pagePath, LOCAL_ORIGIN).href, localErrors)
    ]);
    const boxDifferences = compareBoxes(live.boxes, local.boxes);
    const styleDifferences = compareStyles(live.styles, local.styles);
    const structuralDifferences = [];
    if (live.scroll.width !== local.scroll.width) structuralDifferences.push(`scroll width: live ${live.scroll.width}, local ${local.scroll.width}`);
    if (live.scroll.height !== local.scroll.height) structuralDifferences.push(`scroll height: live ${live.scroll.height}, local ${local.scroll.height}`);
    if (live.cardCount !== local.cardCount) structuralDifferences.push(`card count: live ${live.cardCount}, local ${local.cardCount}`);
    if (JSON.stringify(live.filterLabels) !== JSON.stringify(local.filterLabels)) structuralDifferences.push("filter labels differ");
    if (JSON.stringify(live.navigationLabels) !== JSON.stringify(local.navigationLabels)) structuralDifferences.push("visible navigation labels differ");
    if (JSON.stringify(live.gridImageRendering?.backgroundSize) !== JSON.stringify(local.gridImageRendering?.backgroundSize)) structuralDifferences.push("grid background sizing differs");
    if (local.gridImageRendering?.semanticImageObjectFit && local.gridImageRendering.semanticImageObjectFit !== live.gridImageRendering?.backgroundSize) {
      structuralDifferences.push(`semantic grid image fit ${local.gridImageRendering.semanticImageObjectFit} does not match live background sizing ${live.gridImageRendering?.backgroundSize}`);
    }
    return { pagePath, live, local, boxDifferences, styleDifferences, structuralDifferences };
  } finally {
    await livePage.close();
    await localPage.close();
  }
}

async function interactionState(page) {
  return page.evaluate(() => ({
    urlPath: location.pathname,
    scrollY: Number(scrollY.toFixed(2)),
    scrollHeight: document.documentElement.scrollHeight,
    activeFilterIndex: [...document.querySelectorAll(".css_tag_item")].findIndex(element => element.classList.contains("css_tag_item_active")),
    visibleCards: [...document.querySelectorAll(".css_grid_card_container")]
      .filter(element => getComputedStyle(element).display !== "none")
      .map(element => element.querySelector(".css_grid_text_name")?.textContent.trim())
  }));
}

async function inspectInteractions(browser, viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const results = [];
  try {
    for (const pagePath of ["/", "/projects/"]) {
      const livePage = await context.newPage();
      const localPage = await context.newPage();
      try {
        await Promise.all([
          livePage.goto(new URL(pagePath, BASE_URL).href, { waitUntil: "domcontentloaded", timeout: 90000 }),
          localPage.goto(new URL(pagePath, LOCAL_ORIGIN).href, { waitUntil: "domcontentloaded", timeout: 90000 })
        ]);
        await Promise.all([settlePage(livePage), settlePage(localPage)]);

        const hoverState = async page => {
          await page.locator(".css_grid_card_wrapper").first().hover();
          return page.locator(".css_grid_text_container").first().evaluate(element => ({
            opacity: getComputedStyle(element).opacity,
            visibility: getComputedStyle(element).visibility
          }));
        };
        const hover = [await hoverState(livePage), await hoverState(localPage)];

        const languageLinks = await Promise.all([livePage, localPage].map(page => page.evaluate(() => [...document.querySelectorAll(".css_nav_container a, .css_nav_footer_container a")]
          .map(anchor => ({ label: anchor.textContent.trim(), path: new URL(anchor.href).pathname }))
          .filter(link => link.label === "EN" || link.label === "SV"))));

        await Promise.all([
          livePage.locator(".css_tag_item").nth(1).click(),
          localPage.locator(".css_tag_item").nth(1).click()
        ]);
        await Promise.all([livePage.waitForTimeout(350), localPage.waitForTimeout(350)]);
        const filter = await Promise.all([interactionState(livePage), interactionState(localPage)]);

        await Promise.all([livePage.reload(), localPage.reload()]);
        await Promise.all([settlePage(livePage), settlePage(localPage)]);
        await Promise.all([
          livePage.locator(".css_grid_text_container").first().click(),
          localPage.locator(".css_grid_text_container").first().click()
        ]);
        await Promise.all([livePage.waitForTimeout(700), localPage.waitForTimeout(700)]);
        const cardOpen = await Promise.all([interactionState(livePage), interactionState(localPage)]);

        results.push({
          pagePath,
          viewport: viewport.name,
          hover: { live: hover[0], local: hover[1], matches: JSON.stringify(hover[0]) === JSON.stringify(hover[1]) },
          filter: { live: filter[0], local: filter[1], matches: JSON.stringify(filter[0]) === JSON.stringify(filter[1]) },
          cardOpen: { live: cardOpen[0], local: cardOpen[1], matches: JSON.stringify(cardOpen[0]) === JSON.stringify(cardOpen[1]) },
          languageLinks: { live: languageLinks[0], local: languageLinks[1], matches: JSON.stringify(languageLinks[0]) === JSON.stringify(languageLinks[1]) }
        });
      } finally {
        await livePage.close();
        await localPage.close();
      }
    }
  } finally {
    await context.close();
  }
  return results;
}

function summarize(rows, interactions) {
  const pageFailures = rows.filter(row => row.boxDifferences.length || row.styleDifferences.length || row.structuralDifferences.length);
  const interactionFailures = interactions.filter(row => !row.hover.matches || !row.filter.matches || !row.cardOpen.matches || !row.languageLinks.matches);
  const consoleRows = rows.filter(row => row.live.consoleErrors.length || row.local.consoleErrors.length);
  return { pagePairs: rows.length, pageFailures: pageFailures.length, interactionChecks: interactions.length, interactionFailures: interactionFailures.length, consoleRows: consoleRows.length };
}

async function main() {
  ensureDir(OUTPUT_DIR);
  const server = await startStaticServer(Number(process.env.PORT || 3000));
  const browser = await chromium.launch(browserLaunchOptions());
  const rows = [];
  const interactions = [];
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
      context.setDefaultNavigationTimeout(90000);
      try {
        for (const pagePath of REQUIRED_PATHS) rows.push({ viewport: viewport.name, ...(await inspectPair(context, pagePath)) });
      } finally {
        await context.close();
      }
    }
    for (const viewportName of ["desktop-1440x1200", "mobile-390x844"]) {
      const viewport = VIEWPORTS.find(candidate => candidate.name === viewportName);
      interactions.push(...await inspectInteractions(browser, viewport));
    }
  } finally {
    await browser.close();
    server.close();
  }

  const summary = summarize(rows, interactions);
  const evidence = { generatedAt: new Date().toISOString(), liveOrigin: BASE_URL, localOrigin: LOCAL_ORIGIN, boxTolerancePx: BOX_TOLERANCE_PX, summary, rows, interactions };
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  const report = [
    "# Stage 1 Reference-Parity Evidence",
    "",
    `Generated: ${evidence.generatedAt}`,
    "",
    `- Page/viewport pairs: ${summary.pagePairs}`,
    `- Pairs with bounding-box, computed-style, or structural differences: ${summary.pageFailures}`,
    `- Interaction scenarios: ${summary.interactionChecks}`,
    `- Interaction mismatches: ${summary.interactionFailures}`,
    `- Page pairs with console errors: ${summary.consoleRows}`,
    "",
    "## Page comparison results",
    "",
    "| Viewport | Page | Boxes | Styles | Structure | Live console | Local console |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(row => `| ${row.viewport} | ${row.pagePath} | ${row.boxDifferences.length} | ${row.styleDifferences.length} | ${row.structuralDifferences.length} | ${row.live.consoleErrors.length} | ${row.local.consoleErrors.length} |`),
    "",
    "## Interaction results",
    "",
    "| Viewport | Page | Hover | Filter | Card expansion | Language link |",
    "| --- | --- | --- | --- | --- | --- |",
    ...interactions.map(row => `| ${row.viewport} | ${row.pagePath} | ${row.hover.matches ? "match" : "mismatch"} | ${row.filter.matches ? "match" : "mismatch"} | ${row.cardOpen.matches ? "match" : "mismatch"} | ${row.languageLinks.matches ? "match" : "mismatch"} |`),
    "",
    "Full measurements and mismatch details are in `stage-1-parity-evidence.json`.",
    ""
  ];
  fs.writeFileSync(OUTPUT_MD, report.join("\n"), "utf8");
  console.log(`Reference-parity evidence written for ${summary.pagePairs} page/viewport pairs and ${summary.interactionChecks} interaction scenarios.`);
  if (summary.pageFailures || summary.interactionFailures) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
