const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ROOT, PUBLIC_DIR, ensureDir } = require("./recovery-utils");

const outputDirectory = path.join(PUBLIC_DIR, "assets", "images", "project");
const manifestFile = path.join(ROOT, "content", "image-variants.json");
const widths = [640, 1280];
const images = new Map();

for (const language of ["sv", "en"]) {
  const projects = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "projects", `${language}.json`), "utf8"));
  for (const project of projects) for (const image of project.images || []) if (image.src) images.set(image.src, image);
}

function identify(file) {
  const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", file], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
  if (!width || !height) throw new Error(`Could not determine dimensions for ${file}.`);
  return { width, height };
}

function isDrawing(image) {
  return /\b(drawing|ritning|planritning|dwg)\b/i.test(image.alt || "") || /(?:^|[_-])DWG(?:[_-]|$)/i.test(image.src || "");
}

ensureDir(outputDirectory);
const entries = {};
for (const [source, image] of images) {
  const sourceFile = path.join(PUBLIC_DIR, source.replace(/^\//, ""));
  if (!fs.existsSync(sourceFile)) throw new Error(`Image source is missing: ${source}`);
  const dimensions = identify(sourceFile);
  const variants = [];
  if (!isDrawing(image)) {
    const stem = path.basename(source, path.extname(source)).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const hash = crypto.createHash("sha256").update(source).digest("hex").slice(0, 10);
    for (const width of widths.filter(candidate => candidate < dimensions.width)) {
      const filename = `${stem}-${hash}-${width}.webp`;
      const destination = path.join(outputDirectory, filename);
      execFileSync("magick", [sourceFile, "-resize", `${width}x>`, "-strip", "-quality", "90", destination]);
      variants.push({ src: `/assets/images/project/${filename}`, width });
    }
  }
  entries[source] = { ...dimensions, kind: isDrawing(image) ? "drawing" : "photo", variants };
}
fs.writeFileSync(manifestFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`);
console.log(`Image variant build complete: ${Object.keys(entries).length} source images, ${Object.values(entries).reduce((count, entry) => count + entry.variants.length, 0)} WebP variants.`);
