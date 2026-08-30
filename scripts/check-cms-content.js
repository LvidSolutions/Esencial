const fs = require("fs");
const path = require("path");
const { ROOT } = require("./recovery-utils");

const LANGUAGES = ["sv", "en"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLAN_TYPES = new Set(["planlosning", "situationsplan", "sektion", "fasad", "annat"]);
// These are the original Esencial card surfaces extracted from the recovered
// frontend. A CMS value is a preset, never free-form CSS.
const CARD_BACKGROUND_PRESETS = new Set([
  "warm-paper", "cool-blue", "pale-green", "soft-blush", "mist-blue", "pale-peach",
  "pale-rose", "pale-periwinkle", "ice", "lavender", "sun", "lilac", "stone", "sky", "cloud",
]);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateImage(image, label, { requireCreditAndRights = false } = {}) {
  const problems = [];
  if (!image || !nonEmpty(image.src)) problems.push(`${label}: image source is missing`);
  if (!image || !nonEmpty(image.alt)) problems.push(`${label}: alt text is missing`);
  if (requireCreditAndRights && (!image || !nonEmpty(image.credit))) problems.push(`${label}: photographer or source credit is missing`);
  if (requireCreditAndRights && image?.rightsConfirmed !== true) problems.push(`${label}: publication rights are not confirmed`);
  return problems;
}

function validateProjectSet(projectsByLanguage, { requireCmsFields = false } = {}) {
  const problems = [];
  const projectsById = new Map();

  for (const language of LANGUAGES) {
    const projects = projectsByLanguage[language];
    if (!Array.isArray(projects) || projects.length === 0) {
      problems.push(`${language}: no published projects found`);
      continue;
    }
    const seenIds = new Set();
    const seenSlugs = new Set();
    for (const [projectIndex, project] of projects.entries()) {
      if (!project || typeof project !== "object" || Array.isArray(project)) {
        problems.push(`${language}/item-${projectIndex + 1}: project must be an object`);
        continue;
      }
      const label = `${language}/${project.slug || project.id || project.title || `item-${projectIndex + 1}`}`;
      for (const field of ["id", "slug", "title", "description"]) {
        if (!nonEmpty(project[field])) problems.push(`${label}: missing ${field}`);
      }
      if (project.slug && !SLUG_PATTERN.test(project.slug)) problems.push(`${label}: slug must use lowercase letters, numbers and single hyphens only`);
      if (seenIds.has(project.id)) problems.push(`${label}: duplicate id in ${language}`);
      if (seenSlugs.has(project.slug)) problems.push(`${label}: duplicate slug in ${language}`);
      seenIds.add(project.id);
      seenSlugs.add(project.slug);
      if (nonEmpty(project.id)) {
        const pair = projectsById.get(project.id) || {};
        pair[language] = project;
        projectsById.set(project.id, pair);
      }
      if (project.language !== undefined && project.language !== language) problems.push(`${label}: language field must be ${language}`);
      if (project.descriptionLanguage && !["sv", "en", "es"].includes(project.descriptionLanguage)) problems.push(`${label}: descriptionLanguage must be sv, en, or es when supplied`);
      if (project.seoTitle && project.seoTitle.length > 60) problems.push(`${label}: SEO title exceeds 60 characters`);
      if (project.seoDescription && project.seoDescription.length > 160) problems.push(`${label}: SEO description exceeds 160 characters`);
      if (!Array.isArray(project.images) || !project.images.length) problems.push(`${label}: missing public image`);
      for (const [imageIndex, image] of (project.images || []).entries()) problems.push(...validateImage(image, `${label}: public image ${imageIndex + 1}`));

      if (!requireCmsFields) continue;
      if (project.language !== language) problems.push(`${label}: exported CMS language is missing or inconsistent`);
      if (project.status !== "published") problems.push(`${label}: exported CMS project must have status published`);
      if (project.translationStatus !== "approved") problems.push(`${label}: translationStatus must be approved`);
      if (!nonEmpty(project.seoTitle)) problems.push(`${label}: SEO title is required for published CMS content`);
      if (!nonEmpty(project.seoDescription)) problems.push(`${label}: SEO description is required for published CMS content`);
      if (project.imageRightsConfirmed !== true) problems.push(`${label}: project image rights are not confirmed`);
      const checklist = project.publishChecklist;
      for (const item of ["factsConfirmed", "languageChecked", "seoChecked", "imagesChecked"]) {
        if (checklist?.[item] !== true) problems.push(`${label}: publishChecklist.${item} must be confirmed`);
      }

      const legacyImages = Array.isArray(project.legacyImages) ? project.legacyImages : [];
       const cardImages = Array.isArray(project.cardImages) ? project.cardImages : [];
       const slideshowImages = Array.isArray(project.slideshowImages) ? project.slideshowImages : [];
       const usesCardImageModel = cardImages.length > 0 || slideshowImages.length > 0;
       if (project.cardBackgroundPreset !== undefined && !CARD_BACKGROUND_PRESETS.has(project.cardBackgroundPreset)) {
         problems.push(`${label}: card background must use an existing Esencial card preset`);
       }
       if (usesCardImageModel && cardImages.length !== 2) {
         problems.push(`${label}: exactly two card images are required when using the new image model`);
       }
       if (!usesCardImageModel && !project.heroImage && !legacyImages.length) problems.push(`${label}: a main image is required; migrate legacy media or add heroImage`);
       if (project.heroImage) problems.push(...validateImage(project.heroImage, `${label}: main image`, { requireCreditAndRights: true }));
       for (const [imageIndex, image] of cardImages.entries()) {
         problems.push(...validateImage(image, `${label}: card image ${imageIndex + 1}`, { requireCreditAndRights: true }));
       }
       for (const [imageIndex, image] of (project.galleryImages || []).entries()) {
         problems.push(...validateImage(image, `${label}: gallery image ${imageIndex + 1}`, { requireCreditAndRights: true }));
       }
       for (const [imageIndex, image] of slideshowImages.entries()) {
         problems.push(...validateImage(image, `${label}: slideshow image ${imageIndex + 1}`, { requireCreditAndRights: true }));
       }
      for (const [imageIndex, image] of legacyImages.entries()) {
        problems.push(...validateImage(image, `${label}: legacy image ${imageIndex + 1}`, { requireCreditAndRights: true }));
      }

      const publicSources = new Set((project.images || []).map((image) => image?.src).filter(Boolean));
       if (usesCardImageModel) {
         for (const [imageIndex, image] of cardImages.entries()) {
           if (project.images?.[imageIndex]?.src !== image.src) problems.push(`${label}: card image ${imageIndex + 1} must keep its public slideshow position`);
         }
       } else if (project.heroImage?.src && project.images?.[0]?.src !== project.heroImage.src) problems.push(`${label}: main image must be the first public image`);
      for (const [planIndex, plan] of (project.floorPlans || []).entries()) {
        const planLabel = `${label}: floor plan ${planIndex + 1}`;
        if (!nonEmpty(plan?.name)) problems.push(`${planLabel}: name is missing`);
        if (!PLAN_TYPES.has(plan?.planType)) problems.push(`${planLabel}: planType is missing or unsupported`);
        problems.push(...validateImage(plan?.image, planLabel, { requireCreditAndRights: true }));
        if (plan?.image?.src && publicSources.has(plan.image.src)) problems.push(`${planLabel}: floor-plan media must not be exported as a hero or gallery image`);
      }
    }
  }

  const svIds = new Set((projectsByLanguage.sv || []).map((project) => project?.id).filter(nonEmpty));
  const enIds = new Set((projectsByLanguage.en || []).map((project) => project?.id).filter(nonEmpty));
  for (const id of svIds) if (!enIds.has(id)) problems.push(`sv/${id}: missing English translation`);
  for (const id of enIds) if (!svIds.has(id)) problems.push(`en/${id}: missing Swedish translation`);
  for (const [id, pair] of projectsById.entries()) {
    if (pair.sv && pair.en && pair.sv.slug !== pair.en.slug) problems.push(`${id}: Swedish and English translations must use the same stable slug`);
  }
  return problems;
}

function loadContentDirectory(sourceDirectory) {
  const projectsByLanguage = {};
  const problems = [];
  for (const language of LANGUAGES) {
    const file = path.join(sourceDirectory, `${language}.json`);
    if (!fs.existsSync(file)) {
      problems.push(`Missing ${language} content file: ${file}`);
      continue;
    }
    try {
      projectsByLanguage[language] = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      problems.push(`${file}: invalid JSON (${error.message})`);
    }
  }
  return { projectsByLanguage, problems };
}

function validFixtureProject(language) {
  return {
    id: "paired_project",
    slug: "paired-project",
    title: language === "sv" ? "Kopplat projekt" : "Paired project",
    description: "A sufficiently explicit project description used only by the local safeguard fixture.",
    language,
    status: "published",
    translationStatus: "approved",
    seoTitle: "Paired project | Esencial",
    seoDescription: "A sufficiently explicit project description used only by the local safeguard fixture.",
    imageRightsConfirmed: true,
    publishChecklist: { factsConfirmed: true, languageChecked: true, seoChecked: true, imagesChecked: true },
    heroImage: { src: "/hero.jpg", alt: "Project exterior", credit: "Fixture photographer", rightsConfirmed: true },
     galleryImages: [],
    floorPlans: [{ name: "Ground floor", planType: "planlosning", image: { src: "/floor.png", alt: "Ground floor plan", credit: "Fixture architect", rightsConfirmed: true } }],
    images: [{ src: "/hero.jpg", alt: "Project exterior", credit: "Fixture photographer", rightsConfirmed: true }],
  };
}

function runNegativeFixtures() {
  const valid = { sv: [validFixtureProject("sv")], en: [validFixtureProject("en")] };
  if (validateProjectSet(valid, { requireCmsFields: true }).length) throw new Error("CMS safeguard fixture is invalid: the valid control did not pass.");
  const cases = [
    ["empty export", { ...valid, en: [] }, "en: no published projects found"],
    ["missing translation", { ...valid, en: [{ ...valid.en[0], id: "other_project" }] }, "missing English translation"],
    ["unstable slug", { ...valid, en: [{ ...valid.en[0], slug: "Paired Project" }] }, "slug must use lowercase"],
    ["mismatched pair slug", { ...valid, en: [{ ...valid.en[0], slug: "other-project" }] }, "must use the same stable slug"],
    ["unsupported publication state", { ...valid, en: [{ ...valid.en[0], status: "review" }] }, "must have status published"],
    ["unapproved translation", { ...valid, en: [{ ...valid.en[0], translationStatus: "ready-for-review" }] }, "translationStatus must be approved"],
    ["missing SEO", { ...valid, en: [{ ...valid.en[0], seoTitle: "" }] }, "SEO title is required"],
    ["incomplete checklist", { ...valid, en: [{ ...valid.en[0], publishChecklist: { ...valid.en[0].publishChecklist, imagesChecked: false } }] }, "publishChecklist.imagesChecked must be confirmed"],
    ["missing rights", { ...valid, en: [{ ...valid.en[0], heroImage: { ...valid.en[0].heroImage, rightsConfirmed: false } }] }, "publication rights are not confirmed"],
    ["legacy credit gap", { ...valid, en: [{ ...valid.en[0], heroImage: undefined, legacyImages: [{ src: "/legacy.jpg", alt: "Legacy project photograph", rightsConfirmed: true }], images: [{ src: "/legacy.jpg", alt: "Legacy project photograph" }] }] }, "legacy image 1: photographer or source credit is missing"],
    ["mixed floor-plan media", { ...valid, en: [{ ...valid.en[0], floorPlans: [{ ...valid.en[0].floorPlans[0], image: { ...valid.en[0].floorPlans[0].image, src: "/hero.jpg" } }] }] }, "must not be exported as a hero or gallery image"],
    ["invalid card background", { ...valid, en: [{ ...valid.en[0], cardBackgroundPreset: "url(javascript:alert(1))" }] }, "must use an existing Esencial card preset"],
    ["incomplete card image pair", { ...valid, en: [{ ...valid.en[0], cardImages: [valid.en[0].heroImage], slideshowImages: [] }] }, "exactly two card images are required"],
  ];
  for (const [name, fixture, expected] of cases) {
    const output = validateProjectSet(fixture, { requireCmsFields: true }).join("\n");
    if (!output.includes(expected)) throw new Error(`CMS negative fixture “${name}” did not fail with “${expected}”.`);
  }
  console.log(`CMS negative fixtures passed (${cases.length} unsafe exports rejected; valid bilingual control accepted).`);
}

function main() {
  if (process.argv.includes("--fixtures")) {
    runNegativeFixtures();
    return;
  }
  const sourceDirectory = process.env.CONTENT_SOURCE === "sanity" ? path.join(ROOT, "content", "generated", "sanity") : path.join(ROOT, "content", "projects");
  const { projectsByLanguage, problems } = loadContentDirectory(sourceDirectory);
  problems.push(...validateProjectSet(projectsByLanguage, { requireCmsFields: process.env.CONTENT_SOURCE === "sanity" }));
  if (problems.length) {
    console.error("CMS content validation failed:\n- " + problems.join("\n- "));
    process.exitCode = 1;
    return;
  }
  console.log(`CMS content validation passed (${projectsByLanguage.sv.length + projectsByLanguage.en.length} projects from ${sourceDirectory}).`);
}

if (require.main === module) main();

module.exports = { loadContentDirectory, runNegativeFixtures, validateProjectSet };
