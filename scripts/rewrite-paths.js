const fs = require("fs");
const path = require("path");
const {
  PUBLIC_DIR,
  AUDIT_DIR,
  BASE_URL,
  readJson,
  loadAssetMap,
  replacementForUrl
} = require("./recovery-utils");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rewriteText(text, file, assetMap, replacements) {
  let output = text;
  const replacementEntries = [];
  for (const [url, info] of Object.entries(assetMap).sort((a, b) => b[0].length - a[0].length)) {
    const local = info.webPath;
    if (output.includes(url)) {
      output = output.split(url).join(local);
      replacementEntries.push({ file, from: url, to: local });
    }
    const noProtocol = url.replace(/^https?:/, "");
    if (output.includes(noProtocol)) {
      output = output.split(noProtocol).join(local);
      replacementEntries.push({ file, from: noProtocol, to: local });
    }
  }

  output = output.replace(/https:\/\/(?:www\.)?esencial\.se(\/[^"' <>)\\]*)?/g, (match, route = "/") => {
    replacementEntries.push({ file, from: match, to: route || "/" });
    return route || "/";
  });

  output = output.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)\1\s*\)/g, (match, quote, url) => {
    const replacement = replacementForUrl(url, assetMap);
    if (!replacement) return match;
    replacementEntries.push({ file, from: url, to: replacement });
    return `url(${quote}${replacement}${quote})`;
  });

  replacements.push(...replacementEntries);
  return output;
}

function main() {
  const state = readJson(path.join(AUDIT_DIR, "crawl-state.json"));
  const assetMap = loadAssetMap();
  const replacements = [];
  const candidates = walk(PUBLIC_DIR).filter(file => /\.(html|css|js|json)$/i.test(file));

  for (const file of candidates) {
    const before = fs.readFileSync(file, "utf8");
    const rel = path.relative(PUBLIC_DIR, file).replace(/\\/g, "/");
    const after = rewriteText(before, rel, assetMap, replacements);
    if (after !== before) fs.writeFileSync(file, after, "utf8");
  }

  const report = [
    "# Local Reference Report",
    "",
    `Base URL rewritten: ${BASE_URL}`,
    `Files scanned: ${candidates.length}`,
    `Reference rewrites recorded: ${replacements.length}`,
    "",
    "## Rewrites",
    "",
    ...replacements.map(item => `- ${item.file}: ${item.from} -> ${item.to}`),
    "",
    "## Intentionally Left External",
    "",
    "External references not present in the downloaded asset map were left unchanged so their behavior remains faithful to the live page.",
    ""
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, "local-reference-report.md"), report.join("\n"), "utf8");
  console.log(`Rewrote local references in ${candidates.length} files.`);
}

main();
