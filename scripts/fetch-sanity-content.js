const fs = require("fs");
const path = require("path");
const { ROOT, ensureDir } = require("./recovery-utils");

const projectId = process.env.SANITY_PROJECT_ID || "g6xm8j7l";
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;
const outputDirectory = path.join(ROOT, "content", "generated", "sanity");

if (!token) {
  throw new Error("SANITY_API_TOKEN is required for a CMS build. Add a read-only token as a CI or hosting secret; never commit it.");
}

const query = `*[_type == "project" && status == "published"] | order(title asc) {
  "id": coalesce(translationKey, _id), "slug": slug.current, title, location, year,
  "description": coalesce(seoDescription, summary), seoTitle, seoDescription, language,
  "heroImage": heroImage{"src": asset->url, alt, credit, rightsConfirmed, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "galleryImages": galleryImages[]{"src": asset->url, alt, credit, rightsConfirmed, caption, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "legacyImages": coalesce(images[]{"src": asset->url, alt, credit, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}, legacyImages[]{"src": url, alt}),
  "floorPlans": floorPlans[]{name, planType, area, description, "image": image{"src": asset->url, alt, credit, rightsConfirmed, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}}
}`;
const homeQuery = `*[_type == "homePage" && _id == "homePage"][0]{"featuredProjects": featuredProjects[]{displayStyle, "id": project->translationKey}}`;

async function main() {
  const url = new URL(`https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set("query", query);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Sanity request failed (${response.status}): ${await response.text()}`);
  const { result } = await response.json();
  if (!result.length) throw new Error("CMS build aborted: Sanity has zero published projects. The existing project archive was not changed.");
  const projects = { sv: [], en: [] };
  for (const project of result) {
    if (!projects[project.language]) throw new Error(`Project ${project.title || project._id} has an unsupported language.`);
    const gallery = (project.galleryImages || []).filter((image) => !image.hideFromWebsite);
    const images = [project.heroImage, ...gallery].filter((image) => image?.src);
    project.images = images.length ? images : project.legacyImages || [];
    if (!project.id || !project.slug || !project.title || !project.description || !project.images?.length) throw new Error(`Published project ${project.title || project._id} is missing required website data.`);
    if (project.heroImage && (!project.heroImage.alt || !project.heroImage.credit || !project.heroImage.rightsConfirmed)) throw new Error(`Published project ${project.title || project._id} has an incomplete main image. Add alt-text, credit and confirmed rights.`);
    for (const image of gallery) if (!image.alt || !image.credit || !image.rightsConfirmed) throw new Error(`Published project ${project.title || project._id} has an incomplete gallery image. Add alt-text, credit and confirmed rights.`);
    projects[project.language].push(project);
  }
  if (!projects.sv.length || !projects.en.length) throw new Error("CMS build aborted: published Swedish and English projects are both required.");
  const homeResponse = await fetch(urlForQuery(homeQuery), { headers: { Authorization: `Bearer ${token}` } });
  if (!homeResponse.ok) throw new Error(`Sanity home page request failed (${homeResponse.status}): ${await homeResponse.text()}`);
  const {result: home} = await homeResponse.json();
  ensureDir(outputDirectory);
  for (const language of Object.keys(projects)) fs.writeFileSync(path.join(outputDirectory, `${language}.json`), `${JSON.stringify(projects[language], null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDirectory, "home.json"), `${JSON.stringify(home || {featuredProjects: []}, null, 2)}\n`, "utf8");
  console.log(`Fetched ${projects.sv.length + projects.en.length} published Sanity projects.`);
}

function urlForQuery(query) {
  const url = new URL(`https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set("query", query);
  return url;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
