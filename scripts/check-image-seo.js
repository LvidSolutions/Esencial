const fs = require("fs");
const path = require("path");
const { ROOT, PUBLIC_DIR } = require("./recovery-utils");

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "image-variants.json"), "utf8"));
const errors = [];
let checked = 0;
let responsivePhotos = 0;
let preservedDrawings = 0;

for (const [language, directory] of Object.entries({ sv: "projekt", en: "projects" })) {
  const projects = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "projects", `${language}.json`), "utf8"));
  for (const project of projects) {
    const file = path.join(PUBLIC_DIR, directory, project.slug, "index.html");
    const html = fs.readFileSync(file, "utf8");
    const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
    for (const [index, image] of project.images.entries()) {
      const tag = images[index];
      const metadata = manifest.entries[image.src];
      const label = `/${directory}/${project.slug}/ image ${index + 1}`;
      if (!tag || !metadata) { errors.push(`${label}: image tag or manifest metadata is missing.`); continue; }
      checked += 1;
      for (const expected of [`src="${image.src}"`, `alt="${image.alt.replace(/&/g, "&amp;")}"`, `width="${metadata.width}"`, `height="${metadata.height}"`, `decoding="async"`]) if (!tag.includes(expected)) errors.push(`${label}: missing ${expected}.`);
      if (index === 0 && (!tag.includes('loading="eager"') || !tag.includes('fetchpriority="high"'))) errors.push(`${label}: primary image must be eager and high-priority.`);
      if (index > 0 && !tag.includes('loading="lazy"')) errors.push(`${label}: non-primary image must be lazy.`);
      if (metadata.kind === "photo" && metadata.variants.length) {
        responsivePhotos += 1;
        if (!tag.includes("srcset=") || !tag.includes("sizes=")) errors.push(`${label}: responsive photo variants are missing.`);
        for (const variant of metadata.variants) if (!tag.includes(variant.src)) errors.push(`${label}: missing declared variant ${variant.src}.`);
      }
      if (metadata.kind === "drawing") {
        preservedDrawings += 1;
        if (tag.includes("srcset=")) errors.push(`${label}: drawing should retain its original high-detail asset until a separately approved derivative is available.`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Image SEO validation failed (${errors.length} error(s)):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Image SEO validation passed: ${checked} generated image uses, ${responsivePhotos} responsive photo uses, ${preservedDrawings} high-detail drawing uses.`);
