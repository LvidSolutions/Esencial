const fs = require("fs");
const path = require("path");
const { ROOT, PUBLIC_DIR } = require("./recovery-utils");

const languages = { sv: "projekt", en: "projects" };
const errors = [];
const coverage = { sv: {}, en: {} };

function text(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  return "";
}

function paragraphs(value) {
  if (typeof value === "string") return value.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.map(block => block?._type === "block" ? (block.children || []).map(child => child?.text || "").join("").trim() : "").filter(Boolean);
}

function plain(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function capture(html, expression) {
  const match = html.match(expression);
  return match ? plain(match[1]) : "";
}

for (const [language, directory] of Object.entries(languages)) {
  const projects = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "projects", `${language}.json`), "utf8"));
  const totals = { projects: projects.length, location: 0, year: 0, typology: 0, client: 0, team: 0, services: 0, narrative: 0, related: 0 };
  for (const project of projects) {
    const route = `/${directory}/${project.slug}/`;
    const file = path.join(PUBLIC_DIR, directory, project.slug, "index.html");
    if (!fs.existsSync(file)) {
      errors.push(`${route}: generated page is missing.`);
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    if (capture(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) !== project.title) errors.push(`${route}: H1 does not equal source title.`);
    if (capture(html, /class="project-intro__description"[^>]*>([\s\S]*?)<\/p>/i) !== project.description) errors.push(`${route}: visible introduction does not equal source description.`);
    const fields = { location: text(project.location), year: Number.isInteger(project.year) ? String(project.year) : "", typology: text(project.typology), client: text(project.client), team: text(project.team), services: text(project.services) };
    for (const [field, value] of Object.entries(fields)) {
      if (!value) continue;
      totals[field] += 1;
      if (!html.includes(`<dd>${value.replace(/&/g, "&amp;")}</dd>`)) errors.push(`${route}: confirmed ${field} is absent from the facts list.`);
    }
    const story = paragraphs(project.body);
    if (story.length) {
      totals.narrative += 1;
      if (!html.includes('class="project-narrative"')) errors.push(`${route}: source narrative is absent from the generated page.`);
      for (const paragraph of story) if (!html.includes(`<p>${paragraph.replace(/&/g, "&amp;")}</p>`)) errors.push(`${route}: a source narrative paragraph is absent from the generated page.`);
    }
    const related = (project.relatedProjectIds || project.relatedProjects || []).map(item => typeof item === "string" ? item : item?.id).filter(Boolean);
    if (related.length) {
      totals.related += 1;
      if (!html.includes('class="project-related"')) errors.push(`${route}: source related-project links are absent from the generated page.`);
    }
  }
  coverage[language] = totals;
}

if (errors.length) {
  console.error(`Project-page SEO validation failed (${errors.length} error(s)):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Project-page SEO validation passed: ${coverage.sv.projects + coverage.en.projects} generated pages; optional factual coverage sv=${JSON.stringify(coverage.sv)}, en=${JSON.stringify(coverage.en)}.`);
