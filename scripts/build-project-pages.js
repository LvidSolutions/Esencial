const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, ROOT, ensureDir } = require("./recovery-utils");
const { buildPageGraph, serializeStructuredData } = require("./lib/schema/entity-graph");

const SITE_NAME = "Esencial";
const IMAGE_MANIFEST_FILE = path.join(ROOT, "content", "image-variants.json");
const LANGUAGE_CONFIG = {
  sv: { source: "index.html", overview: "/", directory: "projekt", lang: "sv", overviewLabel: "Projekt", about: "/om-oss/", aboutLabel: "Om oss" },
  en: { source: path.join("projects", "index.html"), overview: "/projects/", directory: "projects", lang: "en", overviewLabel: "Projects", about: "/about/", aboutLabel: "About" }
};
const FACT_LABELS = {
  sv: { location: "Plats", year: "År", typology: "Typologi", client: "Beställare", team: "Arkitekt/team", services: "Uppdrag" },
  en: { location: "Location", year: "Year", typology: "Typology", client: "Client", team: "Architects / team", services: "Scope" }
};

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function decode(value = "") {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, entity) => ({ amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", auml: "ä", ouml: "ö", aring: "å", Auml: "Ä", Ouml: "Ö", Aring: "Å" }[entity] || `&${entity};`))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? decode(match[2]) : "";
}

function extractCards(html, language) {
  const start = /<div class=" css_grid_card_container [\s\S]*?(?=<div class=" css_grid_card_container |<\/div>\s*<\/div>\s*<\/div>\s*<\/main>)/g;
  return [...html.matchAll(start)].map(match => {
    const card = match[0];
    const id = (card.match(/id="project-([^"]+)-title"/i) || [])[1];
    const title = decode((card.match(/css_grid_text_name[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
    const location = decode((card.match(/css_grid_text_location[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);
    const paragraphDescription = (card.match(/css_grid_text_description[\s\S]*?<p>([\s\S]*?)<\/p>/i) || [])[1];
    const inlineDescription = (card.match(/css_grid_text_description[^>]*>([\s\S]*?)<\/div>/i) || [])[1];
    const description = decode(paragraphDescription || inlineDescription);
    const images = [...card.matchAll(/<img\b[^>]*>/gi)].map(image => ({ src: attribute(image[0], "src"), alt: attribute(image[0], "alt") })).filter(image => image.src);
    if (!id || !title || !images.length) {
      throw new Error(`Could not extract required project data for ${id || "unknown project"}.`);
    }
    const fallbackDescription = `${title} ${location ? `${language === "sv" ? "är ett arkitekturprojekt av Esencial i" : "is an architecture project by Esencial in"} ${location}.` : language === "sv" ? "är ett arkitekturprojekt av Esencial." : "is an architecture project by Esencial."}`;
    return { id, slug: id.replace(/_/g, "-"), title, location, description: description || fallbackDescription, images };
  });
}

function projectUrl(language, project) {
  return `/${LANGUAGE_CONFIG[language].directory}/${project.slug}/`;
}

function absoluteUrl(value) {
  return /^https?:\/\//i.test(value) ? value : `${BASE_URL}${value}`;
}

function imageMetadata(image) {
  if (!fs.existsSync(IMAGE_MANIFEST_FILE)) return null;
  const manifest = JSON.parse(readFile(IMAGE_MANIFEST_FILE));
  return manifest.entries?.[image.src] || null;
}

function responsiveImageAttributes(image, index) {
  const metadata = imageMetadata(image);
  const width = image.width || metadata?.width || (index === 0 ? 1600 : 1200);
  const height = image.height || metadata?.height || (index === 0 ? 1000 : 800);
  const variants = metadata?.variants || [];
  const srcset = variants.length ? ` srcset="${[...variants, { src: image.src, width }].map(item => `${escapeHtml(item.src)} ${item.width}w`).join(", ")}" sizes="${index === 0 ? "(min-width: 1280px) 1280px, 100vw" : "(min-width: 700px) 50vw, 100vw"}"` : "";
  return { width, height, srcset };
}

function projectDescription(project, language) {
  if (project.seoDescription) return project.seoDescription;
  if (!project.descriptionLanguage || project.descriptionLanguage === language) return project.description;
  const location = project.location ? ` ${language === "sv" ? "i" : "in"} ${project.location}` : "";
  return `${project.title} ${language === "sv" ? "är ett arkitekturprojekt av Esencial" : "is an architecture project by Esencial"}${location}.`;
}

function textValue(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(", ");
  return "";
}

function bodyParagraphs(body) {
  if (typeof body === "string") return body.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
  if (!Array.isArray(body)) return [];
  return body.map(block => {
    if (typeof block === "string") return block.trim();
    if (block?._type === "block" && Array.isArray(block.children)) return block.children.map(child => child?.text || "").join("").trim();
    return "";
  }).filter(Boolean);
}

function factEntries(project, language) {
  const labels = FACT_LABELS[language];
  return [
    [labels.location, textValue(project.location)],
    [labels.year, Number.isInteger(project.year) ? String(project.year) : ""],
    [labels.typology, textValue(project.typology)],
    [labels.client, textValue(project.client)],
    [labels.team, textValue(project.team)],
    [labels.services, textValue(project.services)]
  ].filter(([, value]) => value);
}

function relatedProjectsMarkup(project, language, projectsById) {
  const relatedIds = (project.relatedProjectIds || project.relatedProjects || []).map(entry => typeof entry === "string" ? entry : entry?.id).filter(Boolean);
  const related = [...new Set(relatedIds)].filter(id => id !== project.id).map(id => projectsById.get(id)).filter(Boolean).slice(0, 3);
  if (!related.length) return "";
  const label = language === "sv" ? "Relaterade projekt" : "Related projects";
  return `
    <section class="project-related" aria-labelledby="related-projects-title">
      <h2 id="related-projects-title">${label}</h2>
      <ul>${related.map(item => `<li><a href="${projectUrl(language, item)}">${escapeHtml(item.title)}</a>${item.location ? `<span> — ${escapeHtml(item.location)}</span>` : ""}</li>`).join("")}</ul>
    </section>`;
}

function languageLinks(project, language, translations) {
  const current = projectUrl(language, project);
  const otherLanguage = language === "sv" ? "en" : "sv";
  const translated = translations[otherLanguage].get(project.id);
  const other = translated ? projectUrl(otherLanguage, translated) : current;
  const swedish = language === "sv" ? current : (translations.sv.get(project.id) ? projectUrl("sv", translations.sv.get(project.id)) : current);
  return [
    `<link rel="canonical" href="${BASE_URL}${current}">`,
    `<link rel="alternate" hreflang="${language}" href="${BASE_URL}${current}">`,
    `<link rel="alternate" hreflang="${otherLanguage}" href="${BASE_URL}${other}">`,
    `<link rel="alternate" hreflang="x-default" href="${BASE_URL}${swedish}">`
  ].join("\n");
}

function pageHtml(project, language, translations, projectsById) {
  const config = LANGUAGE_CONFIG[language];
  const title = project.seoTitle || `${project.title} | ${SITE_NAME}`;
  const description = projectDescription(project, language);
  const canonicalUrl = `${BASE_URL}${projectUrl(language, project)}`;
  const structuredData = buildPageGraph({
    pageType: "WebPage",
    canonicalUrl,
    title,
    description,
    language,
    primaryImage: absoluteUrl(project.images[0].src),
    project: {
      name: project.title,
      description,
      images: project.images.map(image => absoluteUrl(image.src))
    },
    breadcrumbs: [
      { name: config.overviewLabel, url: `${BASE_URL}${config.overview}` },
      { name: project.title, url: canonicalUrl }
    ]
  });
  const visibleDescriptionLanguage = project.descriptionLanguage && project.descriptionLanguage !== language ? ` lang="${escapeHtml(project.descriptionLanguage)}"` : "";
  const imageMarkup = project.images.map((image, index) => {
    const responsive = responsiveImageAttributes(image, index);
    return `
        <figure class="project-gallery__item${index === 0 ? " project-gallery__item--primary" : ""}">
          <img src="${escapeHtml(image.src)}"${responsive.srcset} alt="${escapeHtml(image.alt)}" width="${escapeHtml(String(responsive.width))}" height="${escapeHtml(String(responsive.height))}" loading="${index === 0 ? "eager" : "lazy"}"${index === 0 ? " fetchpriority=\"high\"" : ""} decoding="async">
        </figure>`;
  }).join("");
  const floorPlanMarkup = (project.floorPlans || []).filter((plan) => plan.image?.src).map((plan) => `
        <figure class="project-gallery__item project-floor-plan">
          <img src="${escapeHtml(plan.image.src)}" alt="${escapeHtml(plan.image.alt || plan.name || "")}" width="${escapeHtml(String(plan.image.width || 1200))}" height="${escapeHtml(String(plan.image.height || 800))}" loading="lazy" decoding="async">
          <figcaption>${escapeHtml([plan.name, plan.area, plan.description].filter(Boolean).join(" — "))}</figcaption>
        </figure>`).join("");
  const floorPlansSection = floorPlanMarkup ? `<section class="project-floor-plans" aria-labelledby="floor-plans-title"><h2 id="floor-plans-title">${language === "sv" ? "Planritningar" : "Floor plans"}</h2><div class="project-gallery">${floorPlanMarkup}</div></section>` : "";
  const factEntriesForProject = factEntries(project, language);
  const facts = factEntriesForProject.length ? `<dl class="project-facts">${factEntriesForProject.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : "";
  const paragraphs = bodyParagraphs(project.body);
  const narrative = paragraphs.length ? `
    <section class="project-narrative" aria-labelledby="project-narrative-title">
      <h2 id="project-narrative-title">${language === "sv" ? "Om projektet" : "About the project"}</h2>
      ${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n      ")}
    </section>` : "";
  const relatedProjects = relatedProjectsMarkup(project, language, projectsById);
  return `<!doctype html>
<html lang="${config.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${BASE_URL}${projectUrl(language, project)}">
  <meta property="og:image" content="${escapeHtml(absoluteUrl(project.images[0].src))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(absoluteUrl(project.images[0].src))}">
  <title>${escapeHtml(title)}</title>
  ${languageLinks(project, language, translations)}
  <link rel="stylesheet" href="/wp-content/themes/esencial/css/tachyons.css">
  <link rel="stylesheet" href="/wp-content/themes/esencial/css/styles.css">
  <link rel="stylesheet" href="/assets/css/project-pages.css">
  <script type="application/ld+json">
${serializeStructuredData(structuredData)}
  </script>
</head>
<body class="project-page">
  <a class="skip-link" href="#main-content">${language === "sv" ? "Hoppa till innehållet" : "Skip to content"}</a>
  <header class="project-header">
    <a class="project-header__brand" href="${config.overview}" aria-label="${SITE_NAME}">${SITE_NAME}</a>
    <nav aria-label="${language === "sv" ? "Huvudmeny" : "Main navigation"}">
      <a href="${config.overview}">${config.overviewLabel}</a>
      <a href="${config.about}">${config.aboutLabel}</a>
      <a href="${language === "sv" ? `/projects/${project.slug}/` : `/projekt/${project.slug}/`}" lang="${language === "sv" ? "en" : "sv"}">${language === "sv" ? "EN" : "SV"}</a>
    </nav>
  </header>
  <main id="main-content" class="project-main">
    <nav class="project-breadcrumb" aria-label="Breadcrumb"><a href="${config.overview}">${config.overviewLabel}</a><span aria-hidden="true">/</span><span>${escapeHtml(project.title)}</span></nav>
    <section class="project-intro" aria-labelledby="project-title">
      <p class="project-intro__label">${language === "sv" ? "Projekt" : "Project"}</p>
      <h1 id="project-title">${escapeHtml(project.title)}</h1>${facts ? `
      ${facts}` : ""}
      <p class="project-intro__description"${visibleDescriptionLanguage}>${escapeHtml(project.description)}</p>
    </section>
    <section class="project-gallery" aria-label="${language === "sv" ? "Bilder från" : "Images from"} ${escapeHtml(project.title)}">${imageMarkup}
    </section>${floorPlansSection}${narrative}${relatedProjects}
    <nav class="project-return" aria-label="${language === "sv" ? "Projektlänkar" : "Project links"}"><a href="${config.overview}">${language === "sv" ? "Se alla projekt" : "View all projects"}</a></nav>
  </main>
  <footer class="project-footer"><a href="${config.about}">${SITE_NAME}</a></footer>
</body>
</html>`;
}

function updateOverview(html, language, projects) {
  let output = html;
  for (const project of projects) {
    const hashLink = new RegExp(`href="#${project.id}"`, "g");
    output = output.replace(hashLink, `href="${projectUrl(language, project)}"`);
  }
  const selectedIds = loadHomeOrder();
  if (!selectedIds.length) return output;
  const cardPattern = /<div class=" css_grid_card_container [\s\S]*?(?=<div class=" css_grid_card_container |<\/main>)/g;
  const cards = [...output.matchAll(cardPattern)].map((match) => match[0]);
  const byId = new Map(cards.map((card) => [(card.match(/id="project-([^\"]+)-title"/i) || [])[1], card]));
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  if (!selected.length) return output;
  const rest = cards.filter((card) => !selected.includes(card));
  const ordered = [...selected, ...rest];
  let index = 0;
  return output.replace(cardPattern, () => ordered[index++]);
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function contentFile(language) {
  if (process.env.CONTENT_SOURCE === "sanity") return path.join(ROOT, "content", "generated", "sanity", `${language}.json`);
  return path.join(ROOT, "content", "projects", `${language}.json`);
}

function loadHomeOrder() {
  if (process.env.CONTENT_SOURCE !== "sanity") return [];
  const target = path.join(ROOT, "content", "generated", "sanity", "home.json");
  if (!fs.existsSync(target)) return [];
  const home = JSON.parse(readFile(target));
  return (home.featuredProjects || []).map((entry) => entry.id).filter(Boolean);
}

function loadProjects(language, config) {
  const target = contentFile(language);
  if (fs.existsSync(target)) return JSON.parse(readFile(target));
  if (process.env.CONTENT_SOURCE === "sanity") throw new Error(`Missing generated Sanity content: ${target}. Run npm run fetch-sanity-content first.`);
  const projects = extractCards(readFile(path.join(PUBLIC_DIR, config.source)), language);
  write(target, `${JSON.stringify(projects, null, 2)}\n`);
  return projects;
}

function buildSitemap(translations) {
  const staticRoutes = ["/", "/om-oss/", "/projects/", "/about/"];
  const projectRoutes = Object.entries(translations).flatMap(([language, projects]) => projects.map(project => projectUrl(language, project)));
  const urls = [...staticRoutes, ...projectRoutes];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${BASE_URL}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
}

function main() {
  const translations = {};
  const translationMaps = {};
  const languageProjectMaps = {};
  for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
    translations[language] = loadProjects(language, config);
    translationMaps[language] = new Map(translations[language].map(project => [project.id, project]));
    languageProjectMaps[language] = new Map(translations[language].map(project => [project.id, project]));
  }

  for (const [language, projects] of Object.entries(translations)) {
    for (const project of projects) {
      const output = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].directory, project.slug, "index.html");
      write(output, pageHtml(project, language, translationMaps, languageProjectMaps[language]));
    }
    const overviewFile = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].source);
    write(overviewFile, updateOverview(readFile(overviewFile), language, projects));
  }

  write(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemap(translations));
  console.log(`Built ${translations.sv.length + translations.en.length} project pages and sitemap.xml.`);
}

if (require.main === module) main();

module.exports = { bodyParagraphs, factEntries, pageHtml, projectUrl };
