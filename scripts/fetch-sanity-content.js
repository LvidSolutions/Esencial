const fs = require("fs");
const path = require("path");
const { ROOT, ensureDir } = require("./recovery-utils");
const { validateProjectSet } = require("./check-cms-content");

const outputDirectory = path.join(ROOT, "content", "generated", "sanity");
const identifierPattern = /^[a-z0-9][a-z0-9_-]*$/;

const query = `*[_type == "project" && status == "published"] | order(title asc) {
  _id, "id": translationKey, translationKey, "slug": slug.current, title, location, year, typology, client, team, services,
  architect, projectManager, collaborators, landscape, photography, artwork, grossArea, cardBackgroundPreset, body,
  "description": summary, seoTitle, seoDescription, language, status, translationStatus, imageRightsConfirmed, publishChecklist,
  "relatedProjectIds": relatedProjects[]->translationKey,
  "heroImage": heroImage{"src": asset->url, alt, credit, rightsConfirmed, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "galleryImages": galleryImages[]{"src": asset->url, alt, credit, rightsConfirmed, caption, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "cardImages": cardImages[]{"src": asset->url, alt, credit, rightsConfirmed, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "slideshowImages": slideshowImages[]{"src": asset->url, alt, credit, rightsConfirmed, caption, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "legacyImages": select(
    defined(heroImage.asset) => [],
    count(coalesce(images, [])) > 0 => images[]{"src": asset->url, alt, credit, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
    legacyImages[]{"src": url, alt, credit}
  ),
  "floorPlans": floorPlans[]{name, planType, area, description, "image": image{"src": asset->url, alt, credit, rightsConfirmed, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}}
}`;
const homeQuery = `*[_type == "homePage" && _id == "homePage"][0]{"featuredProjects": featuredProjects[]{displayStyle, "id": project->translationKey, "status": project->status}}`;
const navigationQuery = `{
  "categories": *[_type == "filterCategory"] | order(order asc, key asc) {
    _id, key, labelSv, labelEn, order, visible, "projectRefs": projects[]._ref,
    "projectOrder": projectOrder[]._ref
  },
  "settings": *[_type == "navigationSettings" && _id == "navigationSettings"][0] {
    _id, enabled, headingSv, headingEn, allLabelSv, allLabelEn,
    "gridEntries": gridProjects[]{_key, "projectRef": project._ref, includeInGrid}
  }
}`;

function urlForQuery(queryText, { projectId, dataset }) {
  if (!identifierPattern.test(projectId) || !identifierPattern.test(dataset)) throw new Error("CMS build aborted: SANITY_PROJECT_ID or SANITY_DATASET has an invalid format.");
  const url = new URL(`https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set("query", queryText);
  url.searchParams.set("perspective", "published");
  return url;
}

async function fetchQuery(queryText, config) {
  const response = await fetch(urlForQuery(queryText, config), {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Sanity request failed (${response.status}). Check the project, dataset, read permission and query; the provider response was withheld.`);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Sanity request returned invalid JSON. No generated content was changed.");
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "result")) throw new Error("Sanity request returned no result field. No generated content was changed.");
  return payload.result;
}

function transformProjects(result) {
  if (!Array.isArray(result) || !result.length) throw new Error("CMS build aborted: Sanity has zero published projects. Existing generated content was not changed.");
  const projects = { sv: [], en: [] };
  for (const source of result) {
    const label = source?.title || source?._id || "unknown project";
    if (!source || !projects[source.language]) throw new Error(`CMS build aborted: ${label} must use language sv or en. Existing generated content was not changed.`);
    const galleryImages = Array.isArray(source.galleryImages) ? source.galleryImages : [];
    const cardImages = Array.isArray(source.cardImages) ? source.cardImages : [];
    const slideshowImages = Array.isArray(source.slideshowImages) ? source.slideshowImages : [];
    const visibleGallery = galleryImages.filter((image) => !image.hideFromWebsite);
    const visibleSlideshow = slideshowImages.filter((image) => !image.hideFromWebsite);
    const legacyImages = (Array.isArray(source.legacyImages) ? source.legacyImages : []).map((image) => ({...image, rightsConfirmed: source.imageRightsConfirmed === true}));
    const usesCardImageModel = cardImages.length > 0 || slideshowImages.length > 0;
    // The CMS model makes the two card images the first two public slideshow images.
    // The legacy hero/gallery chain remains intact until a project is explicitly migrated.
    const images = usesCardImageModel
      ? [...cardImages, ...visibleSlideshow].filter((image) => image?.src)
      : [source.heroImage, ...visibleGallery].filter((image) => image?.src);
    projects[source.language].push({...source, galleryImages, cardImages, slideshowImages, legacyImages, images: images.length ? images : legacyImages});
  }
  // Image media and the card surface are intentionally shared by a language
  // pair. Editorial text remains on its own language document and is never
  // copied here.
  const swedishByPair = new Map(projects.sv.map((project) => [project.translationKey || project.id, project]));
  projects.en = projects.en.map((english) => {
    const swedish = swedishByPair.get(english.translationKey || english.id);
    const hasEnglishCardModel = english.cardImages.length > 0 || english.slideshowImages.length > 0;
    if (!swedish || hasEnglishCardModel || !(swedish.cardImages.length || swedish.slideshowImages.length)) return english;
    const cardImages = swedish.cardImages;
    const slideshowImages = swedish.slideshowImages;
    const visibleSlideshow = slideshowImages.filter((image) => !image.hideFromWebsite);
    return {
      ...english,
      cardImages,
      slideshowImages,
      cardBackgroundPreset: english.cardBackgroundPreset || swedish.cardBackgroundPreset,
      images: [...cardImages, ...visibleSlideshow].filter((image) => image?.src),
    };
  });
  const problems = validateProjectSet(projects, { requireCmsFields: true });
  if (problems.length) throw new Error(`CMS build aborted; fix these published Sanity fields before retrying:\n- ${problems.join("\n- ")}`);
  return projects;
}

function validateHome(home, projects) {
  if (home === null || home === undefined) return { featuredProjects: [] };
  if (!home || typeof home !== "object" || !Array.isArray(home.featuredProjects)) throw new Error("CMS build aborted: the published home page export is invalid. Open Startsida and save a valid project list.");
  const knownIds = new Set(projects.sv.map((project) => project.id).filter(Boolean));
  const seen = new Set();
  const featuredProjects = home.featuredProjects.map((entry, index) => {
    const label = `Startsida position ${index + 1}`;
    if (!entry?.id || !knownIds.has(entry.id)) throw new Error(`CMS build aborted: ${label} points to a missing or unpaired published project.`);
    if (entry.status !== "published") throw new Error(`CMS build aborted: ${label} points to a project whose publication state is not published.`);
    if (seen.has(entry.id)) throw new Error(`CMS build aborted: ${label} duplicates project ${entry.id}.`);
    if (!['card', 'featured'].includes(entry.displayStyle || 'card')) throw new Error(`CMS build aborted: ${label} has an unsupported display style.`);
    seen.add(entry.id);
    return { id: entry.id, displayStyle: entry.displayStyle || "card" };
  });
  return { featuredProjects };
}

function containsDraftReference(value) {
  if (typeof value === "string") return value.startsWith("drafts.");
  if (Array.isArray(value)) return value.some(containsDraftReference);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsDraftReference);
}

function transformNavigation(result) {
  if (result === null || result === undefined) return { categories: [], settings: null, malformed: false };
  if (!result || typeof result !== "object" || Array.isArray(result)) return { categories: [], settings: null, malformed: true };
  const categories = Array.isArray(result.categories) ? result.categories : [];
  const settings = result.settings === null || result.settings === undefined
    ? null
    : result.settings && typeof result.settings === "object" && !Array.isArray(result.settings)
      ? result.settings
      : null;
  return {
    categories,
    settings,
    malformed: !Array.isArray(result.categories) || (result.settings !== null && result.settings !== undefined && !settings) || containsDraftReference(result),
  };
}

function writeSnapshot(projects, home, navigation = { categories: [], settings: null, malformed: false }) {
  ensureDir(outputDirectory);
  const outputs = new Map([
    [path.join(outputDirectory, "sv.json"), `${JSON.stringify(projects.sv, null, 2)}\n`],
    [path.join(outputDirectory, "en.json"), `${JSON.stringify(projects.en, null, 2)}\n`],
    [path.join(outputDirectory, "home.json"), `${JSON.stringify(home, null, 2)}\n`],
    [path.join(outputDirectory, "navigation.json"), `${JSON.stringify(navigation, null, 2)}\n`],
  ]);
  const staged = [];
  try {
    for (const [target, contents] of outputs) {
      const temporary = `${target}.s12-${process.pid}.tmp`;
      fs.writeFileSync(temporary, contents, { encoding: "utf8", flag: "wx" });
      staged.push([temporary, target]);
    }
    for (const [temporary, target] of staged) fs.renameSync(temporary, target);
  } finally {
    for (const [temporary] of staged) if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fixtureProject(language) {
  return {
    _id: `project-${language}`,
    id: "fixture_project",
    slug: "fixture-project",
    title: language === "sv" ? "Testprojekt" : "Fixture project",
    description: "A sufficiently detailed local-only description for the CMS fetch safeguard fixture.",
    seoTitle: "Fixture project | Esencial",
    seoDescription: "A sufficiently detailed local-only description for the CMS fetch safeguard fixture.",
    language,
    status: "published",
    translationStatus: "approved",
    imageRightsConfirmed: true,
    publishChecklist: { factsConfirmed: true, languageChecked: true, seoChecked: true, imagesChecked: true },
    heroImage: { src: "/hero.jpg", alt: "Project exterior", credit: "Fixture photographer", rightsConfirmed: true },
    galleryImages: [],
    floorPlans: [],
  };
}

function runFixtures() {
  const expectedFailures = [
    ["zero projects", () => transformProjects([]), "zero published projects"],
    ["unsupported language", () => transformProjects([{...fixtureProject("sv"), language: "de"}]), "must use language sv or en"],
    ["empty translation", () => transformProjects([fixtureProject("sv")]), "no published projects found"],
  ];
  for (const [name, operation, expected] of expectedFailures) {
    let message = "";
    try { operation(); } catch (error) { message = error.message; }
    if (!message.includes(expected)) throw new Error(`Fetch safeguard fixture “${name}” did not fail with “${expected}”.`);
  }
  const projects = transformProjects([fixtureProject("sv"), fixtureProject("en")]);
  const sharedMedia = transformProjects([
    {...fixtureProject("sv"), cardBackgroundPreset: "warm-paper", cardImages: [
      {...fixtureProject("sv").heroImage, src: "/card-one.jpg"},
      {...fixtureProject("sv").heroImage, src: "/card-two.jpg"},
    ], slideshowImages: [{...fixtureProject("sv").heroImage, src: "/slide-three.jpg"}]},
    {...fixtureProject("en"), title: "English editorial title", cardImages: [], slideshowImages: []},
  ]);
  if (sharedMedia.en[0].title !== "English editorial title" || sharedMedia.en[0].images.map((image) => image.src).join(",") !== "/card-one.jpg,/card-two.jpg,/slide-three.jpg") {
    throw new Error("The bilingual shared-media fixture did not preserve English text and Swedish image order.");
  }
  const emptyHome = validateHome(null, projects);
  if (emptyHome.featuredProjects.length !== 0) throw new Error("The explicit empty-home fixture was not preserved.");
  let badHome = "";
  try { validateHome({featuredProjects: [{id: "missing", status: "published"}]}, projects); } catch (error) { badHome = error.message; }
  if (!badHome.includes("missing or unpaired")) throw new Error("The invalid home-reference fixture was not rejected.");
  if (!transformNavigation({categories: {}, settings: null}).malformed) throw new Error("Malformed navigation categories were not marked fail-closed.");
  if (!transformNavigation({categories: [], settings: {_id: "drafts.navigationSettings"}}).malformed) throw new Error("Draft navigation data was not marked fail-closed.");
  if (transformNavigation(null).malformed) throw new Error("Missing navigation was not preserved as the legacy path.");
  console.log(`Sanity fetch fixtures passed (${expectedFailures.length + 4} invalid exports rejected; valid bilingual shared-media and explicit empty-home/navigation controls accepted).`);
}

async function main() {
  if (process.argv.includes("--fixtures")) {
    runFixtures();
    return;
  }
  const config = {
    projectId: process.env.SANITY_PROJECT_ID || "g6xm8j7l",
    dataset: process.env.SANITY_DATASET || "production",
    token: process.env.SANITY_API_TOKEN,
  };
  if (!config.token) throw new Error("SANITY_API_TOKEN is required for a CMS build. Add a read-only token as a CI secret; never expose it to Studio or commit it.");
  const [projectResult, homeResult, navigationResult] = await Promise.all([
    fetchQuery(query, config),
    fetchQuery(homeQuery, config),
    fetchQuery(navigationQuery, config),
  ]);
  const projects = transformProjects(projectResult);
  const home = validateHome(homeResult, projects);
  const navigation = transformNavigation(navigationResult);
  writeSnapshot(projects, home, navigation);
  console.log(`Fetched and validated ${projects.sv.length + projects.en.length} published Sanity projects.`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { fetchQuery, runFixtures, transformNavigation, transformProjects, urlForQuery, validateHome, writeSnapshot };
