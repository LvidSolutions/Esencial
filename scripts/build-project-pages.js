const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, ROOT, ensureDir } = require("./recovery-utils");

const SITE_NAME = "Esencial";
const LANGUAGE_CONFIG = {
  sv: { source: "index.html", overview: "/", directory: "projekt", lang: "sv", overviewLabel: "Projekt", about: "/om-oss/", aboutLabel: "Om oss" },
  en: { source: path.join("projects", "index.html"), overview: "/projects/", directory: "projects", lang: "en", overviewLabel: "Projects", about: "/about/", aboutLabel: "About" }
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

function languageLinks(project, language, translations) {
  const current = projectUrl(language, project);
  const otherLanguage = language === "sv" ? "en" : "sv";
  const translated = translations[otherLanguage].get(project.id);
  const other = translated ? projectUrl(otherLanguage, translated) : current;
  return [
    `<link rel="canonical" href="${BASE_URL}${current}">`,
    `<link rel="alternate" hreflang="${language}" href="${BASE_URL}${current}">`,
    `<link rel="alternate" hreflang="${otherLanguage}" href="${BASE_URL}${other}">`,
    `<link rel="alternate" hreflang="x-default" href="${BASE_URL}${current}">`
  ].join("\n");
}

function projectSchema(project, language, translations) {
  const currentUrl = `${BASE_URL}${projectUrl(language, project)}`;
  const otherLanguage = language === "sv" ? "en" : "sv";
  const translated = translations[otherLanguage].get(project.id);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    url: currentUrl,
    image: project.images.map(image => absoluteUrl(image.src)),
    inLanguage: language,
    creator: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
    ...(project.location ? { locationCreated: { "@type": "Place", name: project.location } } : {}),
    ...(translated ? { workTranslation: { "@type": "CreativeWork", url: `${BASE_URL}${projectUrl(otherLanguage, translated)}`, inLanguage: otherLanguage } } : {})
  };
  return JSON.stringify(schema, null, 2);
}

function pageHtml(project, language, translations) {
  const config = LANGUAGE_CONFIG[language];
  const title = project.seoTitle || `${project.title} | ${SITE_NAME}`;
  const description = project.seoDescription || project.description;
  const imageMarkup = project.images.map((image, index) => `
        <figure class="project-gallery__item${index === 0 ? " project-gallery__item--primary" : ""}">
          <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" width="${escapeHtml(String(image.width || (index === 0 ? 1600 : 1200)))}" height="${escapeHtml(String(image.height || (index === 0 ? 1000 : 800)))}" loading="${index === 0 ? "eager" : "lazy"}"${index === 0 ? " fetchpriority=\"high\"" : ""} decoding="async">
        </figure>`).join("");
  const facts = project.location ? `<dl class="project-facts"><div><dt>${language === "sv" ? "Plats" : "Location"}</dt><dd>${escapeHtml(project.location)}</dd></div></dl>` : "";
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
  <title>${escapeHtml(title)}</title>
  ${languageLinks(project, language, translations)}
  <link rel="stylesheet" href="/wp-content/themes/esencial/css/tachyons.css">
  <link rel="stylesheet" href="/wp-content/themes/esencial/css/styles.css">
  <link rel="stylesheet" href="/assets/css/project-pages.css">
  <script type="application/ld+json">
${projectSchema(project, language, translations)}
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
      <p class="project-intro__description">${escapeHtml(description)}</p>
    </section>
    <section class="project-gallery" aria-label="${language === "sv" ? "Bilder från" : "Images from"} ${escapeHtml(project.title)}">${imageMarkup}
    </section>
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
  return output;
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function contentFile(language) {
  if (process.env.CONTENT_SOURCE === "sanity") return path.join(ROOT, "content", "generated", "sanity", `${language}.json`);
  return path.join(ROOT, "content", "projects", `${language}.json`);
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
  for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
    translations[language] = loadProjects(language, config);
    translationMaps[language] = new Map(translations[language].map(project => [project.id, project]));
  }

  for (const [language, projects] of Object.entries(translations)) {
    for (const project of projects) {
      const output = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].directory, project.slug, "index.html");
      write(output, pageHtml(project, language, translationMaps));
    }
    const overviewFile = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].source);
    write(overviewFile, updateOverview(readFile(overviewFile), language, projects));
  }

  write(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemap(translations));
  console.log(`Built ${translations.sv.length + translations.en.length} project pages and sitemap.xml.`);
}

main();
