const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR, ensureDir } = require("./recovery-utils");

const outputDirectory = path.join(PUBLIC_DIR, "assets", "images", "grid");
const manifestFile = path.join(outputDirectory, "manifest.json");
const sourcePages = [
  path.join(PUBLIC_DIR, "index.html"),
  path.join(PUBLIC_DIR, "projects", "index.html"),
  path.join(PUBLIC_DIR, "om-oss", "index.html"),
  path.join(PUBLIC_DIR, "about", "index.html")
];
const targetWidth = 640;
const photoQualityLevels = [90, 92, 94, 96];
const maxPhotoSsimDistortion = 0.025;

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3] ?? ""]));
}

function isDrawing(src, alt) {
  return /\b(drawing|ritning|planritning|dwg)\b/i.test(alt) || /(?:^|[_-])DWG(?:[_-]|$)/i.test(src);
}

function dimensions(file) {
  const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", file], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
  if (!width || !height) throw new Error(`Could not identify ${file}.`);
  return { width, height };
}

function ssimDistortion(sourceFile, destination, width) {
  const output = execFileSync("magick", [sourceFile, "-resize", `${width}x>`, destination, "-metric", "SSIM", "-compare", "-format", "%[distortion]", "info:"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const value = Number(output);
  if (!Number.isFinite(value)) throw new Error(`Could not measure image quality for ${destination}.`);
  return value;
}

function buildPhotoVariant(sourceFile, destination, width) {
  for (const quality of photoQualityLevels) {
    execFileSync("magick", [sourceFile, "-resize", `${width}x>`, "-strip", "-quality", String(quality), destination]);
    if (ssimDistortion(sourceFile, destination, width) <= maxPhotoSsimDistortion) return quality;
  }
  throw new Error(`Could not preserve the required SSIM quality for ${destination}.`);
}

const images = new Map();
for (const page of sourcePages) {
  const html = fs.readFileSync(page, "utf8");
  for (const match of html.matchAll(/<img\b[^>]*\bdata-seo-image=(?:"(grid|featured)"|'(grid|featured)')[^>]*>/gi)) {
    const parsed = attributes(match[0]);
    if (parsed.src) images.set(parsed.src, { alt: parsed.alt || "", usage: parsed["data-seo-image"] });
  }
}

ensureDir(outputDirectory);
const entries = {};
for (const [src, image] of [...images].sort(([left], [right]) => left.localeCompare(right))) {
  const sourceFile = path.join(PUBLIC_DIR, src.replace(/^\//, ""));
  if (!fs.existsSync(sourceFile)) throw new Error(`Grid source is missing: ${src}`);
  const original = dimensions(sourceFile);
  const stem = path.basename(src, path.extname(src)).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const hash = crypto.createHash("sha256").update(src).digest("hex").slice(0, 10);
  const drawing = isDrawing(src, image.alt);
  const widths = image.usage === "featured" ? [640, 1280] : [targetWidth];
  const variants = [];
  for (const requestedWidth of widths) {
    const width = Math.min(requestedWidth, original.width);
    if (variants.some(variant => variant.width === width)) continue;
    const height = Math.round(original.height * width / original.width);
    const filename = `${stem}-${hash}-${width}.webp`;
    const destination = path.join(outputDirectory, filename);
    let quality;
    if (drawing) {
      execFileSync("magick", [sourceFile, "-resize", `${requestedWidth}x>`, "-strip", "-define", "webp:lossless=true", destination]);
      quality = "lossless";
    } else {
      quality = buildPhotoVariant(sourceFile, destination, width);
    }
    variants.push({ src: `/assets/images/grid/${filename}`, width, height, quality, bytes: fs.statSync(destination).size });
  }
  entries[src] = {
    src: variants[0].src,
    width: variants[0].width,
    height: variants[0].height,
    kind: drawing ? "drawing-lossless" : "photo",
    usage: image.usage,
    bytes: variants.reduce((total, variant) => total + variant.bytes, 0),
    variants
  };
}

fs.writeFileSync(manifestFile, `${JSON.stringify({ targetWidth, entries }, null, 2)}\n`, "utf8");
console.log(`Performance grid assets built: ${Object.keys(entries).length} deterministic WebP derivatives.`);
