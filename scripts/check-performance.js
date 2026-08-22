const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { ROOT, PUBLIC_DIR, ensureDir, startStaticServer, browserLaunchOptions } = require("./recovery-utils");

const manifestFile = path.join(PUBLIC_DIR, "assets", "images", "grid", "manifest.json");
const evidenceFile = path.join(ROOT, "audit", "performance", "runtime-evidence.json");
const routes = [
  { name: "home", path: "/" },
  { name: "about", path: "/om-oss/" },
  { name: "project", path: "/projekt/domkyrkoforum/" }
];
const viewports = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1440x1200", width: 1440, height: 1200 }
];

function validateAssets() {
  const errors = [];
  if (!fs.existsSync(manifestFile)) return { errors: ["Performance asset manifest is missing."], summary: null };
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const entries = Object.entries(manifest.entries || {});
  if (entries.length !== 56) errors.push(`Expected 56 performance image entries, found ${entries.length}.`);
  let derivativeBytes = 0;
  let derivativeCount = 0;
  for (const [source, entry] of entries) {
    if (!fs.existsSync(path.join(PUBLIC_DIR, source.replace(/^\//, "")))) errors.push(`Missing original ${source}.`);
    if (entry.usage === "grid" && entry.variants?.length !== 1) errors.push(`${source}: grid image must have one overview variant.`);
    if (entry.usage === "featured" && entry.variants?.length !== 2) errors.push(`${source}: featured image must have mobile and desktop variants.`);
    for (const variant of entry.variants || []) {
      const file = path.join(PUBLIC_DIR, variant.src.replace(/^\//, ""));
      if (!fs.existsSync(file)) errors.push(`Missing derivative ${variant.src}.`);
      else {
        const bytes = fs.statSync(file).size;
        if (bytes !== variant.bytes) errors.push(`${variant.src}: manifest bytes ${variant.bytes} differ from file bytes ${bytes}.`);
        derivativeBytes += bytes;
        derivativeCount += 1;
      }
    }
  }
  if (derivativeBytes > 8 * 1024 * 1024) errors.push(`Performance derivatives exceed 8 MiB: ${derivativeBytes} bytes.`);
  return { errors, summary: { entries: entries.length, derivativeCount, derivativeBytes } };
}

async function inspectRuntime() {
  const server = await startStaticServer(0);
  const port = server.address().port;
  const browser = await chromium.launch(browserLaunchOptions());
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
      await context.addInitScript(() => {
        window.__performanceEvidence = { lcp: 0, cls: 0, longestTask: 0 };
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          if (entries.length) window.__performanceEvidence.lcp = entries[entries.length - 1].startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__performanceEvidence.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) window.__performanceEvidence.longestTask = Math.max(window.__performanceEvidence.longestTask, entry.duration);
          }).observe({ type: "longtask", buffered: true });
        }
      });
      for (const route of routes) {
        const page = await context.newPage();
        const consoleErrors = [];
        page.on("console", message => {
          if (message.type() !== "error") return;
          const location = message.location().url || "";
          if (location.endsWith("/favicon.ico")) return;
          consoleErrors.push(`${message.text()}${location ? ` (${location})` : ""}`);
        });
        await page.goto(`http://127.0.0.1:${port}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(750);
        const metrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType("resource");
          const navigation = performance.getEntriesByType("navigation")[0];
          return {
            lcpMs: window.__performanceEvidence.lcp,
            cls: window.__performanceEvidence.cls,
            longestTaskMs: window.__performanceEvidence.longestTask,
            encodedBodyBytes: (navigation?.encodedBodySize || 0) + resources.reduce((sum, item) => sum + (item.encodedBodySize || 0), 0),
            resourceCount: resources.length + 1,
            loadedOriginalImages: resources.filter(item => item.name.includes("/wp-content/uploads/") && item.encodedBodySize > 0).length,
            loadedDerivativeImages: resources.filter(item => item.name.includes("/assets/images/grid/") && item.name.endsWith(".webp") && item.encodedBodySize > 0).length
          };
        });
        let interactionLatency = null;
        if (route.name === "home") {
          interactionLatency = await page.evaluate(async () => {
            const target = document.querySelector(".css_tag_item");
            const start = performance.now();
            target.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return performance.now() - start;
          });
        }
        results.push({ route: route.path, viewport: viewport.name, ...metrics, syntheticInteractionLatencyMs: interactionLatency, consoleErrors });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  return results;
}

(async () => {
  const assetValidation = validateAssets();
  const runtime = await inspectRuntime();
  const errors = [...assetValidation.errors];
  for (const result of runtime) {
    const label = `${result.route} ${result.viewport}`;
    if (result.lcpMs > 2500) errors.push(`${label}: local unthrottled LCP ${result.lcpMs.toFixed(1)}ms exceeds 2500ms.`);
    if (result.cls > 0.1) errors.push(`${label}: CLS ${result.cls.toFixed(4)} exceeds 0.1.`);
    if (result.longestTaskMs > 200) errors.push(`${label}: longest task ${result.longestTaskMs.toFixed(1)}ms exceeds 200ms.`);
    if (result.syntheticInteractionLatencyMs != null && result.syntheticInteractionLatencyMs > 200) errors.push(`${label}: synthetic interaction latency ${result.syntheticInteractionLatencyMs.toFixed(1)}ms exceeds 200ms.`);
    if (result.consoleErrors.length) errors.push(`${label}: console errors: ${result.consoleErrors.join(" | ")}`);
  }
  ensureDir(path.dirname(evidenceFile));
  fs.writeFileSync(evidenceFile, `${JSON.stringify({
    methodology: {
      browser: "Playwright Chromium",
      network: "local unthrottled static server",
      interactionNote: "Synthetic click-to-two-animation-frames latency; this is not field INP."
    },
    assetSummary: assetValidation.summary,
    runtime,
    errors
  }, null, 2)}\n`, "utf8");
  if (errors.length) {
    console.error(`Performance validation failed (${errors.length} error(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Performance validation passed: ${runtime.length} route/viewport cases, ${assetValidation.summary.derivativeCount} derivatives, zero LCP/CLS/long-task/synthetic-latency budget failures.`);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
