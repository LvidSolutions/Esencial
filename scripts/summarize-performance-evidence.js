const fs = require("fs");
const path = require("path");
const { ROOT, PUBLIC_DIR, ensureDir } = require("./recovery-utils");

const baselineDirectory = path.join(ROOT, "audit", "performance", "baseline", "lighthouse");
const finalDirectory = path.join(ROOT, "audit", "performance", "final-stable", "lighthouse");
const outputJson = path.join(ROOT, "audit", "performance", "lighthouse-summary.json");
const outputMarkdown = path.join(ROOT, "audit", "performance", "lighthouse-summary.md");
const baselineAssetTotal = { files: 196, bytes: 32735598 };

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function readRuns(directory) {
  const groups = new Map();
  for (const filename of fs.readdirSync(directory).filter(file => file.endsWith(".json"))) {
    const match = filename.match(/^(home|about|project)-(mobile|desktop)-run\d+\.json$/);
    if (!match) continue;
    const report = JSON.parse(fs.readFileSync(path.join(directory, filename), "utf8"));
    const diagnostics = report.audits.diagnostics.details.items[0];
    const key = `${match[1]}-${match[2]}`;
    const values = groups.get(key) || [];
    values.push({
      file: filename,
      score: report.categories.performance.score * 100,
      fcpMs: report.audits["first-contentful-paint"].numericValue,
      lcpMs: report.audits["largest-contentful-paint"].numericValue,
      cls: report.audits["cumulative-layout-shift"].numericValue,
      tbtMs: report.audits["total-blocking-time"].numericValue,
      speedIndexMs: report.audits["speed-index"].numericValue,
      transferBytes: diagnostics.totalByteWeight,
      requests: diagnostics.numRequests
    });
    groups.set(key, values);
  }
  return Object.fromEntries([...groups].sort(([left], [right]) => left.localeCompare(right)).map(([key, runs]) => [key, {
    runs: runs.length,
    median: Object.fromEntries(["score", "fcpMs", "lcpMs", "cls", "tbtMs", "speedIndexMs", "transferBytes", "requests"].map(metric => [metric, median(runs.map(run => run[metric]))])),
    raw: runs
  }]));
}

function assetTotal() {
  let files = 0;
  let bytes = 0;
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else { files += 1; bytes += fs.statSync(target).size; }
    }
  };
  walk(PUBLIC_DIR);
  return { files, bytes };
}

const baseline = readRuns(baselineDirectory);
const final = readRuns(finalDirectory);
const comparisons = {};
for (const key of Object.keys(baseline)) {
  if (!final[key]) continue;
  comparisons[key] = {
    lcpMs: final[key].median.lcpMs - baseline[key].median.lcpMs,
    cls: final[key].median.cls - baseline[key].median.cls,
    transferBytes: final[key].median.transferBytes - baseline[key].median.transferBytes,
    requests: final[key].median.requests - baseline[key].median.requests,
    score: final[key].median.score - baseline[key].median.score
  };
}

const summary = {
  methodology: {
    lighthouse: "12.8.2",
    browser: "Chrome 151.0.7922.170",
    throttling: "Lighthouse simulated throttling",
    repetitions: "Baseline two runs per case; final two runs per case and three runs for home.",
    inp: "Not measured: Lighthouse navigation lab runs do not produce valid field INP."
  },
  assetTotals: { baseline: baselineAssetTotal, final: assetTotal() },
  baseline,
  final,
  comparisons
};

ensureDir(path.dirname(outputJson));
fs.writeFileSync(outputJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
const rows = Object.keys(comparisons).map(key => {
  const before = baseline[key].median;
  const after = final[key].median;
  return `| ${key} | ${before.score.toFixed(0)} → ${after.score.toFixed(0)} | ${before.lcpMs.toFixed(0)} → ${after.lcpMs.toFixed(0)} | ${before.cls.toFixed(3)} → ${after.cls.toFixed(3)} | ${(before.transferBytes / 1048576).toFixed(2)} → ${(after.transferBytes / 1048576).toFixed(2)} | ${before.requests.toFixed(0)} → ${after.requests.toFixed(0)} |`;
});
const markdown = `# Lighthouse evidence summary\n\nPinned Lighthouse 12.8.2 with Chrome 151 and simulated throttling. Values are medians; raw JSON is retained in \`baseline/lighthouse/\` and \`final-stable/lighthouse/\`.\n\n| Case | Score | LCP ms | CLS | Transfer MiB | Requests |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${rows.join("\n")}\n\nINP is not reported because navigation-only Lighthouse lab runs do not provide valid field INP. Synthetic interaction latency is recorded separately in \`runtime-evidence.json\`.\n`;
fs.writeFileSync(outputMarkdown, markdown, "utf8");
console.log(`Performance evidence summarized for ${Object.keys(comparisons).length} route/form-factor cases.`);
