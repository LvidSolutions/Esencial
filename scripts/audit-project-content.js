const fs = require("fs");
const path = require("path");
const { ROOT, ensureDir } = require("./recovery-utils");

const outputDirectory = path.join(ROOT, "audit", "seo-final");
const evidenceFile = path.join(outputDirectory, "stage-6-project-content-evidence.json");
const reportFile = path.join(outputDirectory, "stage-6-project-content-gaps.md");
const fieldNames = ["location", "year", "typology", "client", "team", "services", "body", "relatedProjectIds"];

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(typeof value === "string" ? value.trim() : value);
}

function isGeneric(project, language) {
  const expected = language === "sv" ? `${project.title} är ett arkitekturprojekt av Esencial` : `${project.title} is an architecture project by Esencial`;
  return project.description.trim().startsWith(expected);
}

const evidence = { generatedAt: new Date().toISOString(), languages: {}, requiresHumanApproval: [] };
for (const language of ["sv", "en"]) {
  const projects = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "projects", `${language}.json`), "utf8"));
  const missing = Object.fromEntries(fieldNames.map(field => [field, []]));
  const shortIntroductions = [];
  const genericIntroductions = [];
  const languageTaggedIntroductions = [];
  for (const project of projects) {
    for (const field of fieldNames) if (!hasValue(project[field])) missing[field].push(project.id);
    if (project.description.trim().length < 80) shortIntroductions.push(project.id);
    if (isGeneric(project, language)) genericIntroductions.push(project.id);
    if (project.descriptionLanguage && project.descriptionLanguage !== language) languageTaggedIntroductions.push({ id: project.id, language: project.descriptionLanguage });
  }
  evidence.languages[language] = { projects: projects.length, missing, shortIntroductions, genericIntroductions, languageTaggedIntroductions };
  for (const id of [...new Set([...missing.year, ...missing.typology, ...missing.client, ...missing.team, ...missing.services, ...missing.body])]) evidence.requiresHumanApproval.push({ language, id, reason: "Missing optional public project facts or approved long-form narrative." });
}

ensureDir(outputDirectory);
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
const lines = [
  "# Stage 6 — Project-content approval queue",
  "",
  `Generated: ${evidence.generatedAt}`,
  "",
  "This is an editorial queue, not a build failure. Missing facts are intentionally omitted from public pages until Esencial confirms that they are factual and publishable.",
  ""
];
for (const language of ["sv", "en"]) {
  const result = evidence.languages[language];
  lines.push(`## ${language.toUpperCase()} (${result.projects} projects)`, "");
  lines.push(`- Generic factual fallback introductions: ${result.genericIntroductions.length || "none"}`);
  lines.push(`- Short introductions under 80 characters: ${result.shortIntroductions.length || "none"}`);
  lines.push(`- Visible excerpts tagged as another language: ${result.languageTaggedIntroductions.length || "none"}`);
  for (const field of fieldNames) lines.push(`- Missing ${field}: ${result.missing[field].length}`);
  lines.push("");
  if (result.genericIntroductions.length) lines.push(`Generic intro IDs: ${result.genericIntroductions.join(", ")}`, "");
  if (result.languageTaggedIntroductions.length) lines.push(`Language-tagged excerpt IDs: ${result.languageTaggedIntroductions.map(item => `${item.id} (${item.language})`).join(", ")}`, "");
}
lines.push("## Editorial action", "", "For each project, confirm the exact public year, typology, client, team, scope, narrative, and genuinely related projects. Add a field only when it is both accurate and cleared for publication; the generator will then display it with page-language labels.", "");
fs.writeFileSync(reportFile, lines.join("\n"));
console.log(`Project content audit written for ${evidence.languages.sv.projects + evidence.languages.en.projects} source records.`);
