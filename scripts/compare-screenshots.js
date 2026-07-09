const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const {
  AUDIT_DIR,
  SCREENSHOT_DIR,
  ensureDir,
  readJson
} = require("./recovery-utils");

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function padPng(source, width, height) {
  const target = new PNG({ width, height, fill: true });
  target.data.fill(255);
  PNG.bitblt(source, target, 0, 0, source.width, source.height, 0, 0);
  return target;
}

async function main() {
  const pixelmatch = (await import("pixelmatch")).default;
  const captures = readJson(path.join(AUDIT_DIR, "visual-captures.json"), []);
  ensureDir(path.join(SCREENSHOT_DIR, "diff"));
  const rows = [];

  for (const capture of captures) {
    const live = readPng(capture.live);
    const local = readPng(capture.local);
    const width = Math.max(live.width, local.width);
    const height = Math.max(live.height, local.height);
    const livePadded = padPng(live, width, height);
    const localPadded = padPng(local, width, height);
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(livePadded.data, localPadded.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: true
    });
    const diffFile = path.join(SCREENSHOT_DIR, "diff", `${path.basename(capture.live, ".png")}.png`);
    fs.writeFileSync(diffFile, PNG.sync.write(diff));
    rows.push({
      page: capture.page,
      viewport: capture.viewport,
      live: capture.live,
      local: capture.local,
      diff: diffFile,
      liveSize: `${live.width}x${live.height}`,
      localSize: `${local.width}x${local.height}`,
      diffPixels,
      diffPercent: Number(((diffPixels / (width * height)) * 100).toFixed(4))
    });
  }

  const report = [
    "# Visual Diff Report",
    "",
    "| Page | Viewport | Difference | Live | Local | Diff | Notes |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...rows.map(row => `| ${row.page} | ${row.viewport} | ${row.diffPercent}% | ${path.relative(process.cwd(), row.live).replace(/\\/g, "/")} | ${path.relative(process.cwd(), row.local).replace(/\\/g, "/")} | ${path.relative(process.cwd(), row.diff).replace(/\\/g, "/")} | ${row.liveSize === row.localSize ? "Same screenshot dimensions." : `Different dimensions: live ${row.liveSize}, local ${row.localSize}.`} |`),
    "",
    "Differences are image-based and include minor dynamic rendering differences such as antialiasing, third-party request timing, and live-site animation state.",
    ""
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "visual-diff-report.md"), report.join("\n"), "utf8");
  fs.writeFileSync(path.join(AUDIT_DIR, "visual-diff-report.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Compared ${rows.length} screenshot pairs.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
