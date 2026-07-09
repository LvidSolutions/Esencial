const fs = require("fs");
const path = require("path");
const {
  AUDIT_DIR,
  ROOT,
  ensureDir,
  readJson,
  writeJson,
  assetOutputForUrl,
  extractUrlsFromCss
} = require("./recovery-utils");

async function download(url, assetMap, missing, inventory, queue, referencedBy = "") {
  if (assetMap[url] || missing.find(item => item.url === url)) return;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 static recovery",
        "Accept": "*/*"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const output = assetOutputForUrl(url, contentType);
    const affectsVisualAccuracy = !/(\/wp-json\/|\/xmlrpc\.php|google-analytics\.com\/g\/collect)/i.test(url);
    if (!response.ok) {
      missing.push({
        url,
        referencedBy,
        status: response.status,
        error: response.statusText,
        affectsVisualAccuracy
      });
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    ensureDir(path.dirname(output.filePath));
    fs.writeFileSync(output.filePath, buffer);
    assetMap[url] = {
      url,
      file: path.relative(ROOT, output.filePath).replace(/\\/g, "/"),
      webPath: output.webPath,
      contentType,
      bytes: buffer.length,
      referencedBy
    };
    inventory.push(assetMap[url]);

    if (contentType.includes("text/css") || /\.css(?:$|\?)/i.test(url)) {
      const css = buffer.toString("utf8");
      for (const cssUrl of extractUrlsFromCss(css, url)) {
        if (!assetMap[cssUrl]) queue.push({ url: cssUrl, referencedBy: url });
      }
    }
  } catch (error) {
    missing.push({
      url,
      referencedBy,
      status: "error",
      error: error.message,
      affectsVisualAccuracy: !/(\/wp-json\/|\/xmlrpc\.php|google-analytics\.com\/g\/collect)/i.test(url)
    });
  }
}

async function main() {
  const state = readJson(path.join(AUDIT_DIR, "crawl-state.json"));
  if (!state) throw new Error("Missing audit/crawl-state.json. Run crawl-site.js first.");
  const assetMap = {};
  const missing = [];
  const inventory = [];
  const queue = state.assets.map(asset => ({ url: asset.url, referencedBy: asset.referencedBy || "" }));

  for (let i = 0; i < queue.length; i += 1) {
    await download(queue[i].url, assetMap, missing, inventory, queue, queue[i].referencedBy);
  }

  writeJson(path.join(AUDIT_DIR, "asset-map.json"), assetMap);
  writeJson(path.join(AUDIT_DIR, "missing-assets.json"), missing);

  const inventoryLines = [
    "# Asset Inventory",
    "",
    `Copied assets: ${inventory.length}`,
    "",
    "| Type | Bytes | Original URL | Local file |",
    "| --- | ---: | --- | --- |",
    ...inventory
      .sort((a, b) => a.url.localeCompare(b.url))
      .map(item => `| ${item.contentType || "unknown"} | ${item.bytes} | ${item.url} | ${item.file} |`),
    ""
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "asset-inventory.md"), inventoryLines.join("\n"), "utf8");

  const missingLines = [
    "# Missing Assets",
    "",
    missing.length ? `Missing/problematic assets: ${missing.length}` : "No missing public assets were detected during download.",
    "",
    ...missing.map(item => [
      `## ${item.url}`,
      "",
      `- Referenced by: ${item.referencedBy || "unknown"}`,
      `- HTTP status/error: ${item.status} ${item.error || ""}`.trim(),
      `- Affects visual accuracy: ${item.affectsVisualAccuracy ? "yes" : "unknown"}`,
      `- Access needed: ${item.affectsVisualAccuracy ? "public access or original CMS/source files if this URL is needed for rendering." : "none for visual recovery; this is a non-rendering WordPress/API endpoint."}`,
      ""
    ].join("\n"))
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "missing-assets.md"), missingLines.join("\n"), "utf8");
  console.log(`Downloaded ${inventory.length} assets. Missing/problematic: ${missing.length}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
