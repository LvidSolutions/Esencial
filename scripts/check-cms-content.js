const fs = require("fs");
const path = require("path");
const { ROOT } = require("./recovery-utils");
const sourceDirectory = process.env.CONTENT_SOURCE === "sanity" ? path.join(ROOT, "content", "generated", "sanity") : path.join(ROOT, "content", "projects");
const problems = [];
const projectsByLanguage = {};

for (const language of ["sv", "en"]) {
  const file = path.join(sourceDirectory, `${language}.json`);
  if (!fs.existsSync(file)) problems.push(`Missing ${language} content file: ${file}`);
  else projectsByLanguage[language] = JSON.parse(fs.readFileSync(file, "utf8"));
}
for (const [language, projects] of Object.entries(projectsByLanguage)) {
  if (!Array.isArray(projects) || projects.length === 0) {
    problems.push(`${language}: no published projects found`);
    continue;
  }
  const seenSlugs = new Set();
  for (const project of projects) {
    const label = `${language}/${project.slug || project.title || "unknown"}`;
    for (const field of ["id", "slug", "title", "description"]) if (!project[field]) problems.push(`${label}: missing ${field}`);
    if (seenSlugs.has(project.slug)) problems.push(`${label}: duplicate slug`);
    seenSlugs.add(project.slug);
    if (project.seoTitle && project.seoTitle.length > 60) problems.push(`${label}: SEO title exceeds 60 characters`);
    if (project.seoDescription && project.seoDescription.length > 160) problems.push(`${label}: SEO description exceeds 160 characters`);
    if (!Array.isArray(project.images) || !project.images.length) problems.push(`${label}: missing image`);
    for (const image of project.images || []) if (!image.src || !image.alt) problems.push(`${label}: image needs both src and alt`);
    if (project.heroImage && (!project.heroImage.alt || !project.heroImage.credit || !project.heroImage.rightsConfirmed)) problems.push(`${label}: main image needs alt text, credit and confirmed rights`);
    for (const [index, image] of (project.galleryImages || []).entries()) if (!image.hideFromWebsite && (!image.src || !image.alt || !image.credit || !image.rightsConfirmed)) problems.push(`${label}: gallery image ${index + 1} needs alt text, credit and confirmed rights`);
    for (const [index, plan] of (project.floorPlans || []).entries()) if (!plan.name || !plan.image?.src || !plan.image.alt) problems.push(`${label}: floor plan ${index + 1} needs a name, image and alt text`);
  }
}
const svIds = new Set((projectsByLanguage.sv || []).map((project) => project.id));
const enIds = new Set((projectsByLanguage.en || []).map((project) => project.id));
for (const id of svIds) if (!enIds.has(id)) problems.push(`sv/${id}: missing English translation`);
for (const id of enIds) if (!svIds.has(id)) problems.push(`en/${id}: missing Swedish translation`);
if (problems.length) { console.error("CMS content validation failed:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`CMS content validation passed (${projectsByLanguage.sv.length + projectsByLanguage.en.length} projects from ${sourceDirectory}).`);
