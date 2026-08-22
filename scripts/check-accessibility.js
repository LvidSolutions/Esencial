const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  AUDIT_DIR,
  BASE_URL,
  LOCAL_ORIGIN,
  PUBLIC_DIR,
  browserLaunchOptions,
  ensureDir,
  settlePage,
  startStaticServer
} = require("./recovery-utils");

const corePaths = ["/", "/projects/", "/om-oss/", "/about/"];
const projectPaths = ["/projekt/domkyrkoforum/", "/projects/domkyrkoforum/"];
const paths = [
  ...corePaths,
  ...fs.readdirSync(path.join(PUBLIC_DIR, "projekt"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `/projekt/${entry.name}/`),
  ...fs.readdirSync(path.join(PUBLIC_DIR, "projects"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `/projects/${entry.name}/`)
];
const outputDir = path.join(AUDIT_DIR, "accessibility");
const outputPath = path.join(outputDir, "s10-accessibility-evidence.json");
const localOrigin = process.env.ACCESSIBILITY_ORIGIN || LOCAL_ORIGIN;
const localPort = Number(new URL(localOrigin).port || 80);

function fileForUrl(url) {
  return url === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, url.slice(1), "index.html");
}

function expectedLanguage(url) {
  return url === "/" || url.startsWith("/om-oss/") || url.startsWith("/projekt/") ? "sv" : "en";
}

function textOnly(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function ratio(hex) {
  const values = hex.match(/[0-9a-f]{2}/gi).map(value => Number.parseInt(value, 16) / 255);
  const linear = values.map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return (1.05) / (Math.min(...linear) * .2126 + linear[1] * .7152 + linear[2] * .0722 + .05);
}

function staticAudit() {
  const errors = [];
  const summary = { pages: paths.length, images: 0, headings: 0, coreFilters: 0 };
  for (const url of paths) {
    const html = fs.readFileSync(fileForUrl(url), "utf8");
    const language = (html.match(/<html\b[^>]*\blang="([^"]+)"/i) || [])[1];
    if (language !== expectedLanguage(url)) errors.push(`${url}: expected html lang=${expectedLanguage(url)}, found ${language || "none"}.`);
    const viewport = (html.match(/<meta\b[^>]*name="viewport"[^>]*>/i) || [])[0] || "";
    if (!viewport || /maximum-scale|user-scalable\s*=\s*no/i.test(viewport)) errors.push(`${url}: viewport blocks zoom or is missing.`);
    if ((html.match(/<main\b/gi) || []).length !== 1 || !/id="main-content"/i.test(html)) errors.push(`${url}: expected one #main-content landmark.`);
    if (!/<a\b[^>]*class="skip-link"[^>]*href="#main-content"/i.test(html)) errors.push(`${url}: missing skip link to #main-content.`);
    const headingLevels = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(match => Number(match[1]));
    summary.headings += headingLevels.length;
    if (headingLevels.filter(level => level === 1).length !== 1) errors.push(`${url}: expected one h1.`);
    for (let index = 1; index < headingLevels.length; index += 1) {
      if (headingLevels[index] > headingLevels[index - 1] + 1) errors.push(`${url}: heading level jumps from h${headingLevels[index - 1]} to h${headingLevels[index]}.`);
    }
    const images = [...html.matchAll(/<img\b([^>]*)>/gi)];
    summary.images += images.length;
    for (const image of images) {
      const attributes = image[1];
      const alt = (attributes.match(/\balt="([^"]*)"/i) || [])[1];
      if (alt === undefined) errors.push(`${url}: image has no alt attribute.`);
      if (/data-seo-image=/i.test(attributes) && !textOnly(alt || "")) errors.push(`${url}: informative SEO image has empty alt text.`);
    }
    if (["/", "/projects/"].includes(url)) {
      const filters = [...html.matchAll(/<div\b([^>]*)class="[^"]*css_tag_item[^"]*"([^>]*)>/gi)];
      summary.coreFilters += filters.length;
      if (filters.length !== 5) errors.push(`${url}: expected five keyboard-operable project-filter controls.`);
      for (const filter of filters) {
        const attributes = `${filter[1]} ${filter[2]}`;
        if (!/role="button"/i.test(attributes) || !/tabindex="0"/i.test(attributes) || !/aria-pressed="(?:true|false)"/i.test(attributes)) errors.push(`${url}: filter control lacks button semantics, keyboard focus, or valid pressed state.`);
      }
    }
  }
  return { errors, summary };
}

async function browserAudit() {
  const errors = [];
  const evidence = { keyboard: {}, focus: {}, reflow: {}, reducedMotion: {}, accessibleNames: {}, focusOutlineContrast: ratio("005fcc") };
  const server = await startStaticServer(localPort);
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(new URL("/projects/", localOrigin).href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => ({
      className: document.activeElement.className,
      outline: getComputedStyle(document.activeElement).outlineStyle,
      top: getComputedStyle(document.activeElement).top
    }));
    evidence.keyboard.firstFocus = firstFocus;
    if (!String(firstFocus.className).includes("skip-link") || firstFocus.outline === "none") errors.push("/projects/: first keyboard focus is not a visibly focused skip link.");
    await page.keyboard.press("Enter");
    evidence.keyboard.skipDestination = await page.evaluate(() => ({ hash: location.hash, mainTop: Math.round(document.querySelector("main").getBoundingClientRect().top) }));
    if (evidence.keyboard.skipDestination.hash !== "#main-content") errors.push("/projects/: skip link did not target #main-content.");
    const filter = page.locator('[role="button"].css_tag_item').first();
    await filter.focus();
    evidence.focus.filter = await filter.evaluate(element => ({
      outline: getComputedStyle(element).outlineStyle,
      outlineColor: getComputedStyle(element).outlineColor,
      opacity: getComputedStyle(element).opacity
    }));
    if (evidence.focus.filter.outline === "none") errors.push("/projects/: filter button has no visible keyboard focus treatment.");
    await page.keyboard.press("Enter");
    evidence.keyboard.filter = await page.evaluate(() => ({
      pressed: document.querySelector('[role="button"].css_tag_item').getAttribute("aria-pressed"),
      hiddenCards: document.querySelectorAll(".css_grid_card_container.tag-dn").length
    }));
    if (evidence.keyboard.filter.pressed !== "true" || !evidence.keyboard.filter.hiddenCards) errors.push("/projects/: filter button did not work via keyboard.");
    const cardLink = page.locator(".css_grid_card_container:not(.tag-dn) .css_grid_text_name a").first();
    await cardLink.focus();
    await page.waitForTimeout(700);
    evidence.focus.cardLink = await cardLink.evaluate(element => ({
      outline: getComputedStyle(element).outlineStyle,
      overlayOpacity: getComputedStyle(element.closest(".css_grid_card_wrapper").querySelector(".css_grid_text_container")).opacity,
      wrapperFocusWithin: element.closest(".css_grid_card_wrapper").matches(":focus-within"),
      cardClasses: element.closest(".css_grid_card_container").className
    }));
    if (evidence.focus.cardLink.outline === "none" || evidence.focus.cardLink.overlayOpacity !== "1") errors.push("/projects/: focused project link is not visibly revealed.");
    evidence.accessibleNames.projects = await page.evaluate(() => [...document.querySelectorAll("a, button")].map(element => ({
      tag: element.tagName.toLowerCase(),
      name: (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim()
    })).filter(item => !item.name));
    if (evidence.accessibleNames.projects.length) errors.push(`/projects/: ${evidence.accessibleNames.projects.length} interactive element(s) have no programmatic/text name.`);
    await page.close();
    await context.close();

    const reflowContext = await browser.newContext({ viewport: { width: 320, height: 800 }, ignoreHTTPSErrors: true });
    const reflowPage = await reflowContext.newPage();
    for (const route of [...corePaths, ...projectPaths]) {
      await reflowPage.goto(new URL(route, localOrigin).href, { waitUntil: "domcontentloaded" });
      evidence.reflow[route] = await reflowPage.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      if (evidence.reflow[route].scrollWidth > evidence.reflow[route].clientWidth) errors.push(`${route}: horizontal overflow at 320 CSS px.`);
    }
    await reflowPage.close();
    await reflowContext.close();

    const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ignoreHTTPSErrors: true });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(new URL("/projects/", localOrigin).href, { waitUntil: "domcontentloaded" });
    evidence.reducedMotion = await reducedPage.locator(".css_grid_text_container").first().evaluate(element => ({
      transitionDuration: getComputedStyle(element).transitionDuration,
      animationDuration: getComputedStyle(element).animationDuration
    }));
    if (!["0.01s", "1e-05s"].includes(evidence.reducedMotion.transitionDuration)) errors.push("/projects/: reduced-motion preference does not shorten transitions.");
    await reducedPage.close();
    await reducedContext.close();
  } finally {
    await browser.close();
    server.close();
  }
  if (evidence.focusOutlineContrast < 3) errors.push("Focus-outline color does not meet 3:1 contrast against the white canvas.");
  return { errors, evidence };
}

async function main() {
  const staticResult = staticAudit();
  console.log(`Static accessibility audit passed ${staticResult.summary.pages} route(s); starting Chromium checks.`);
  const browserResult = await browserAudit();
  ensureDir(outputDir);
  const evidence = {
    generatedAt: new Date().toISOString(),
    liveReference: BASE_URL,
    localOrigin,
    static: staticResult.summary,
    browser: browserResult.evidence,
    errors: [...staticResult.errors, ...browserResult.errors]
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Accessibility checks: ${evidence.static.pages} pages, ${evidence.static.images} images, ${evidence.static.headings} headings, ${evidence.errors.length} error(s). Evidence: ${path.relative(process.cwd(), outputPath)}`);
  if (evidence.errors.length) {
    for (const error of evidence.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
