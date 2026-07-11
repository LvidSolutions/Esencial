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
  "images": coalesce(images[]{"src": asset->url, alt, credit, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}, legacyImages[]{"src": url, alt})
}`;

async function main() {
  const url = new URL(`https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set("query", query);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Sanity request failed (${response.status}): ${await response.text()}`);
  const { result } = await response.json();
  const projects = { sv: [], en: [] };
  for (const project of result) {
    if (!projects[project.language]) throw new Error(`Project ${project.title || project._id} has an unsupported language.`);
    if (!project.id || !project.slug || !project.title || !project.description || !project.images?.length) throw new Error(`Published project ${project.title || project._id} is missing required website data.`);
    projects[project.language].push(project);
  }
  ensureDir(outputDirectory);
  for (const language of Object.keys(projects)) fs.writeFileSync(path.join(outputDirectory, `${language}.json`), `${JSON.stringify(projects[language], null, 2)}\n`, "utf8");
  console.log(`Fetched ${projects.sv.length + projects.en.length} published Sanity projects.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
