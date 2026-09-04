const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { BASE_URL, PUBLIC_DIR, ROOT, ensureDir } = require("./recovery-utils");
const { buildPageGraph, serializeStructuredData } = require("./lib/schema/entity-graph");

const SITE_NAME = "Esencial";
const IMAGE_MANIFEST_FILE = path.join(ROOT, "content", "image-variants.json");
const LANGUAGE_CONFIG = {
  sv: { source: "index.html", overview: "/", directory: "projekt", lang: "sv", overviewLabel: "Projekt", about: "/om-oss/", aboutLabel: "Om oss" },
  en: { source: path.join("projects", "index.html"), overview: "/projects/", directory: "projects", lang: "en", overviewLabel: "Projects", about: "/about/", aboutLabel: "About" }
};
const FACT_LABELS = {
  sv: { location: "Plats", year: "Byggnadsår", typology: "Typologi", client: "Byggherre", architect: "Arkitekt", projectManager: "Handläggare", collaborators: "Medarbetare", landscape: "Landskap", photography: "Foto", artwork: "Konstnärlig utsmyckning", grossArea: "Bruttoarea", team: "Arkitekt/team", services: "Uppdrag" },
  en: { location: "Location", year: "Year built", typology: "Typology", client: "Client", architect: "Architect", projectManager: "Project lead", collaborators: "Contributors", landscape: "Landscape", photography: "Photography", artwork: "Public art", grossArea: "Gross floor area", team: "Architects / team", services: "Scope" }
};
// Stable CMS names map only to surfaces already present in the recovered
// Esencial cards. Values are never accepted as arbitrary CSS.
const CARD_BACKGROUND_PRESETS = Object.freeze({
  "warm-paper": "#fffbf5", "cool-blue": "#f7fafd", "pale-green": "#f9fff9",
  "soft-blush": "#fff7f7", "mist-blue": "#f2f9f9", "pale-peach": "#fef9f6",
  "pale-rose": "#fffbf9", "pale-periwinkle": "#f7f7ff", "ice": "#f8fbfc",
  "lavender": "#fdf9ff", "sun": "#fffef5", "lilac": "#fafbff",
  "stone": "#f8f7f5", "sky": "#fbfdff", "cloud": "#fafcfe",
});

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

function containsDraftReference(value) {
  if (typeof value === "string") return value.startsWith("drafts.");
  if (Array.isArray(value)) return value.some(containsDraftReference);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsDraftReference);
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

function presentationViewsForProject(project) {
  return Array.isArray(project.presentationViews)
    ? project.presentationViews.filter((view) => view && (view.left?.src || view.right?.src))
    : [];
}

function presentationViewMarkup(view, index) {
  const mediaMarkup = (image, side) => {
    if (!image?.src || image.hideFromWebsite) return `<div class="project-presentation-view__empty" aria-hidden="true"></div>`;
    const responsive = responsiveImageAttributes(image, index * 2 + (side === "right" ? 1 : 0));
    return `<figure class="project-presentation-view__item project-presentation-view__item--${side}">
      <img src="${escapeHtml(image.src)}"${responsive.srcset} alt="${escapeHtml(image.alt || "")}" width="${escapeHtml(String(responsive.width))}" height="${escapeHtml(String(responsive.height))}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async">
      ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
    </figure>`;
  };
  return `<div class="project-presentation-view" data-view-index="${index + 1}">${mediaMarkup(view.left, "left")}${mediaMarkup(view.right, "right")}</div>`;
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
    [labels.year, Number.isInteger(project.year) ? String(project.year) : ""],
    [labels.location, textValue(project.location)],
    [labels.client, textValue(project.client)],
    [labels.architect, textValue(project.architect)],
    [labels.projectManager, textValue(project.projectManager)],
    [labels.collaborators, textValue(project.collaborators)],
    [labels.landscape, textValue(project.landscape)],
    [labels.photography, textValue(project.photography)],
    [labels.artwork, textValue(project.artwork)],
    [labels.grossArea, textValue(project.grossArea)],
    // Existing migrated content continues to use these only when the matching
    // new field is absent. This prevents duplicated public facts.
    [labels.typology, textValue(project.typology)],
    [labels.team, textValue(project.architect) ? "" : textValue(project.team)],
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
  const presentationViews = presentationViewsForProject(project);
  const imageMarkup = presentationViews.length ? presentationViews.map(presentationViewMarkup).join("") : project.images.map((image, index) => {
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
  ${presentationViews.length ? '<style>.project-presentation-view{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0}.project-presentation-view__item{margin:0}.project-presentation-view__item img{display:block;width:100%;height:auto}.project-presentation-view__empty{min-height:12rem;background:var(--esencial-card-background,#f6f2eb)}@media(max-width:700px){.project-presentation-view{grid-template-columns:1fr}}</style>\n  ' : ''}<link rel="stylesheet" href="/assets/css/project-pages.css">
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

function configuredFilterMarkup(navigation, language) {
  const items = [
    { key: "all", label: navigation.allLabels[language] },
    ...navigation.categories.map((category) => ({ key: category.key, label: category.labels[language] })),
  ];
  return `<div class="css_tag_container">\n${items.map((item) => `<div class="css_tag_wrapper"><div class="css_tag_item css_tag_item_inactive" data-tag="${item.key}" role="button" tabindex="0" aria-pressed="false">${escapeHtml(item.label)}</div></div>`).join("\n")}\n</div>\n`;
}

function projectGridParts(html) {
  const gridPattern = /(<div class=" css_grid_container"[^>]*>\s*)([\s\S]*?)(\s*<\/div>\s*)(?=<div class=" css__feed__container)/;
  const match = html.match(gridPattern);
  if (!match) return null;
  const cardPattern = /<div class=" css_grid_card_container [\s\S]*?(?=<div class=" css_grid_card_container |$)/g;
  return { match, cards: [...match[2].matchAll(cardPattern)].map((card) => card[0]) };
}

function replaceProjectCards(html, cards) {
  const grid = projectGridParts(html);
  if (!grid) return null;
  return html.replace(grid.match[0], `${grid.match[1]}${cards.join("")}${grid.match[3]}`);
}

function projectFeedParts(html) {
  const feedPattern = /(<div class=" css__feed__container feed-dn">\s*)([\s\S]*?)(\s*<\/div>\s*)(?=<\/main>)/;
  const match = html.match(feedPattern);
  if (!match) return null;
  const projectPattern = /<div class=" css_feed_project_container [\s\S]*?(?=<div class=" css_feed_project_container |$)/g;
  return { match, projects: [...match[2].matchAll(projectPattern)].map((entry) => entry[0]) };
}

function replaceProjectFeeds(html, feeds) {
  const feed = projectFeedParts(html);
  if (!feed) return null;
  return html.replace(feed.match[0], `${feed.match[1]}${feeds.join("")}${feed.match[3]}`);
}

function normalizedCardBackground(value, fallback = "#fffbf5") {
  return typeof value === "string" && CARD_BACKGROUND_PRESETS[value] ? CARD_BACKGROUND_PRESETS[value] : fallback;
}

function cardBackgroundFromMarkup(card) {
  const match = card.match(/css_grid_card_wrapper " style="background-color:([^";]+)/i);
  return normalizedCardBackground(match?.[1]?.trim());
}

function cardImagesForProject(project) {
  const configured = Array.isArray(project.cardImages) ? project.cardImages.filter((image) => image?.src) : [];
  if (configured.length === 2) return configured;
  return (project.images || []).filter((image) => image?.src).slice(0, 2);
}

function usesCardImageModel(project) {
  return Array.isArray(project.cardImages) && project.cardImages.filter((image) => image?.src).length === 2;
}

function overviewImageMarkup(image, index, priority) {
  const responsive = responsiveImageAttributes(image, index);
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? " fetchpriority=\"high\"" : "";
  return `<div class=" css_grid_photo_container "><div class=" css_grid_photo_wrapper "><div class=" css_grid_photo_item " style="background-image:url(${escapeHtml(image.src)})"><img data-seo-image="grid" src="${escapeHtml(image.src)}"${responsive.srcset} alt="${escapeHtml(image.alt)}" width="${escapeHtml(String(responsive.width))}" height="${escapeHtml(String(responsive.height))}" loading="${loading}"${fetchPriority} decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></div></div></div>`;
}

function projectCardMarkup(project, language, {background, priority = false} = {}) {
  const images = cardImagesForProject(project);
  if (images.length !== 2) return null;
  const pairKey = project.translationKey || project.id;
  const cardBackground = normalizedCardBackground(project.cardBackgroundPreset, background);
  const description = project.description || projectDescription(project, language);
  return `<div class=" css_grid_card_container " name="${escapeHtml(project.slug)}" role="listitem" aria-labelledby="project-${escapeHtml(pairKey)}-title"><div class=" css_grid_card_wrapper " style="background-color:${cardBackground}">
${overviewImageMarkup(images[0], 0, priority)}
${overviewImageMarkup(images[1], 1, false)}
<div class=" css_grid_text_container " style="background-color:${cardBackground}">
<div class=" css_grid_text_top_wrapper ">
<div class=" css_grid_text_name " id="project-${escapeHtml(pairKey)}-title"><a href="${projectUrl(language, project)}" style="color:inherit;text-decoration:none">${escapeHtml(project.title)}</a></div>
<div class=" css_grid_text_location ">${escapeHtml(textValue(project.location))}</div>
</div>
<div class=" css_grid_text_bottom_wrapper "><div class=" css_grid_text_description "><p>${escapeHtml(description)}</p></div></div>
</div>
</div></div>`;
}

function feedFactsMarkup(project, language) {
  const projectNameLabel = language === "sv" ? "PROJEKTNAMN" : "PROJECT NAME";
  return [`<p><strong>${projectNameLabel}</strong><br>${escapeHtml(project.title)}</p>`, ...factEntries(project, language).map(([label, value]) => `<p><strong>${escapeHtml(label.toUpperCase())}</strong><br>${escapeHtml(value)}</p>`)].join("\n");
}

function projectFeedMarkup(project, language, {background} = {}) {
  const images = (project.images || []).filter((image) => image?.src);
  if (!images.length) return null;
  const cardBackground = normalizedCardBackground(project.cardBackgroundPreset, background);
  const primary = images[0];
  const secondary = images[1] || primary;
  const paragraphs = bodyParagraphs(project.body);
  const description = paragraphs.length ? paragraphs : [project.description].filter(Boolean);
  const dots = images.map((_, index) => `<div class=" css_feed_footer_item${index === 0 ? "_current" : ""} ">•</div>`).join("");
  return `<div class=" css_feed_project_container " name="${escapeHtml(project.slug)}" id="${escapeHtml(project.slug)}">
<div class=" css_feed_photo_container "><div class=" css_feed_photo_wrapper ">
<div class=" css_feed_photo_item " style="background-image:url(${escapeHtml(primary.src)})" id="photograph"></div>
<div class=" css_feed_photo_preload " style="background-image:url(${escapeHtml(secondary.src)})"></div>
<div class=" css_feed_footer_container "><div class=" css_feed_footer_wrapper ">${dots}</div></div>
</div></div>
<div class=" css_feed_draw_container " style="background-color:${cardBackground}"><div class=" css_feed_draw_wrapper ">
<div class=" css_feed_draw_item " style="background-image:url(${escapeHtml(secondary.src)})" id="drawing"></div>
<div class=" css_feed_draw_preload " style="background-image:url(${escapeHtml(primary.src)})"></div>
<div class=" css_feed_footer_container "><div class=" css_feed_footer_wrapper ">${dots}</div></div>
</div></div>
<div class=" css_feed_text_container "><div class=" css_feed_text_wrapper " style="background-color:${cardBackground}">
<div class=" css_feed_text_info_container "><div class=" css_feed_text_info_wrapper "><div class=" css_feed_text_info_item "><div class=" css_feed_text_info_item_entry ">${feedFactsMarkup(project, language)}</div></div></div></div>
<div class=" css_feed_text_description_container "><div class=" css_feed_text_description_item ">${description.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div></div>
<div class=" css_feed_text_footer_container "></div>
</div></div>
</div>`;
}

function withProjectOrderAttributes(tag, project, navigation, language) {
  const pairKey = project.translationKey || project.id;
  const attributes = [` data-esencial-order-all="${navigation.projectsByLanguage[language].findIndex((item) => (item.translationKey || item.id) === pairKey) + 1}"`];
  for (const category of navigation.categories) {
    const positions = category.projectOrderIdsByLanguage?.[language] || category.projectIdsByLanguage?.[language] || [];
    const position = positions.indexOf(String(project._id || ""));
    if (position >= 0) attributes.push(` data-esencial-order-${escapeHtml(category.key)}="${position + 1}"`);
  }
  return tag.replace(/>$/, `${attributes.join("")}>`);
}

function navigationWithFilterOrders(navigation, sourceCategories, projects) {
  const byId = new Map(projects.map((project) => [String(project?._id || "").replace(/^drafts\./, ""), project]));
  const byPair = new Map();
  for (const project of projects) {
    const key = project.translationKey || project.id;
    if (!key) continue;
    const pair = byPair.get(key) || {};
    pair[project.language] = project;
    byPair.set(key, pair);
  }
  return {
    ...navigation,
    categories: navigation.categories.map((category) => {
      const source = sourceCategories.find((item) => item?.key === category.key);
      const orderRefs = Array.isArray(source?.projectOrder) && source.projectOrder.length
        ? source.projectOrder
        : source?.projectRefs;
      const ordered = (orderRefs || [])
        .map((id) => byId.get(String(id || "").replace(/^drafts\./, "")))
        .filter(Boolean)
        .map((project) => byPair.get(project.translationKey || project.id))
        .filter((pair) => pair?.sv && pair?.en);
      const pairIds = {
        sv: ordered.map((pair) => String(pair.sv._id).replace(/^drafts\./, "")),
        en: ordered.map((pair) => String(pair.en._id).replace(/^drafts\./, "")),
      };
      // A malformed optional order cannot change membership or hide projects.
      const valid = pairIds.sv.length === category.projectIdsByLanguage.sv.length
        && pairIds.en.length === category.projectIdsByLanguage.en.length;
      return {...category, projectOrderIdsByLanguage: valid ? pairIds : category.projectIdsByLanguage};
    }),
  };
}

function configuredMembershipTag(tag, categoryKeys, allCategoryKeys) {
  const removableKeys = ["all", ...allCategoryKeys];
  const attributePattern = new RegExp(`\\s(?:${removableKeys.join("|")})=(['\"])\\1`, "g");
  const cleanTag = tag.replace(attributePattern, "").replace(/>$/, "");
  return `${cleanTag} all=""${categoryKeys.map((key) => ` ${key}=""`).join("")}>`;
}

function renderConfiguredOverview(html, language, projects, navigation) {
  const grid = projectGridParts(html);
  const feed = projectFeedParts(html);
  if (!grid || !feed) return null;
  const cards = grid.cards;
  const cardsByPair = new Map(cards.map((card) => [(card.match(/id="project-([^\"]+)-title"/i) || [])[1], card]));
  const feedsByPair = new Map(feed.projects.map((entry) => [(entry.match(/\bid="([^\"]+)"/i) || [])[1], entry]));
  const projectsByPair = new Map(projects.map((project) => [project.translationKey || project.id, project]));
  const selectedProjects = navigation.projectsByLanguage[language];
  const orderedCards = [];
  const orderedFeeds = [];
  const allCategoryKeys = navigation.categories.map((category) => category.key);
  for (const [projectIndex, project] of selectedProjects.entries()) {
    const pairKey = project.translationKey || project.id;
    const card = cardsByPair.get(pairKey);
    const projectFeed = feedsByPair.get(pairKey);
    if (!pairKey) return null;
    const needsRenderedCard = usesCardImageModel(project) || !card;
    const needsRenderedFeed = usesCardImageModel(project) || !projectFeed;
    const effectiveCard = needsRenderedCard
      ? projectCardMarkup(project, language, {background: card ? cardBackgroundFromMarkup(card) : undefined, priority: projectIndex === 0})
      : card;
    const effectiveFeed = needsRenderedFeed
      ? projectFeedMarkup(project, language, {background: card ? cardBackgroundFromMarkup(card) : undefined})
      : projectFeed;
    if (!effectiveCard || !effectiveFeed) return null;
    const documentId = String(project._id || "");
    const categoryKeys = navigation.categories
      .filter((category) => category.projectIdsByLanguage[language].includes(documentId))
      .map((category) => category.key);
    orderedCards.push(effectiveCard.replace(
      /^<div class=" css_grid_card_container "[^>]*>/i,
      (tag) => withProjectOrderAttributes(configuredMembershipTag(tag, categoryKeys, allCategoryKeys), project, navigation, language),
    ));
    orderedFeeds.push(effectiveFeed.replace(
      /^<div class=" css_feed_project_container "[^>]*>/i,
      (tag) => withProjectOrderAttributes(configuredMembershipTag(tag, categoryKeys, allCategoryKeys), project, navigation, language),
    ));
  }
  if (orderedCards.length !== selectedProjects.length || orderedFeeds.length !== selectedProjects.length) return null;
  if (selectedProjects.some((project) => !projectsByPair.has(project.translationKey || project.id))) return null;

  const headingPattern = /<h1 class="screen-reader-text">[\s\S]*?<\/h1>/;
  const filterPattern = /<div class="css_tag_container">[\s\S]*?(?=<div class=" css_grid_container")/;
  if (!headingPattern.test(html) || !filterPattern.test(html) || cards.length === 0) return null;
  let output = html.replace(
    headingPattern,
    `<h1 class="screen-reader-text">${escapeHtml(navigation.headings[language])}</h1>`,
  );
  output = output.replace(filterPattern, configuredFilterMarkup(navigation, language));
  output = replaceProjectCards(output, orderedCards);
  if (!output) return null;
  return replaceProjectFeeds(output, orderedFeeds);
}

function applyPublishedNavigation(html, language, projects, snapshot, resolveProjectNavigation) {
  const legacy = { html };
  if (!snapshot || snapshot.malformed === true || containsDraftReference(snapshot) || projects.some((project) => String(project?._id || "").startsWith("drafts."))) return legacy.html;
  const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
  const settings = snapshot.settings && typeof snapshot.settings === "object" && !Array.isArray(snapshot.settings)
    ? snapshot.settings
    : undefined;
  let resolved;
  try {
    resolved = resolveProjectNavigation({ projects, categories, settings, legacy });
  } catch {
    return legacy.html;
  }
  if (resolved.mode !== "configured") return resolved.data === legacy ? resolved.data.html : legacy.html;
  const navigation = navigationWithFilterOrders(resolved.data, categories, projects);
  return renderConfiguredOverview(html, language, projects, navigation) || legacy.html;
}

function updateOverview(html, language, projects, navigationContext) {
  let output = html;
  for (const project of projects) {
    const hashLink = new RegExp(`href="#${project.id}"`, "g");
    output = output.replace(hashLink, `href="${projectUrl(language, project)}"`);
  }
  const selectedIds = loadHomeOrder();
  if (selectedIds.length) {
    const grid = projectGridParts(output);
    const cards = grid?.cards || [];
    const byId = new Map(cards.map((card) => [(card.match(/id="project-([^\"]+)-title"/i) || [])[1], card]));
    const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);
    if (selected.length) {
      const rest = cards.filter((card) => !selected.includes(card));
      const ordered = [...selected, ...rest];
      output = replaceProjectCards(output, ordered) || output;
    }
  }
  if (!navigationContext?.resolver) return output;
  return applyPublishedNavigation(
    output,
    language,
    navigationContext.projects,
    navigationContext.snapshot,
    navigationContext.resolver,
  );
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

function loadNavigationSnapshot() {
  if (process.env.CONTENT_SOURCE !== "sanity") return undefined;
  const target = path.join(ROOT, "content", "generated", "sanity", "navigation.json");
  if (!fs.existsSync(target)) return undefined;
  try {
    return JSON.parse(readFile(target));
  } catch {
    return { categories: [], settings: null, malformed: true };
  }
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

async function main() {
  const translations = {};
  const translationMaps = {};
  const languageProjectMaps = {};
  for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
    translations[language] = loadProjects(language, config);
    translationMaps[language] = new Map(translations[language].map(project => [project.id, project]));
    languageProjectMaps[language] = new Map(translations[language].map(project => [project.id, project]));
  }

  const navigationSnapshot = loadNavigationSnapshot();
  let navigationResolver;
  if (navigationSnapshot) {
    const contractUrl = pathToFileURL(path.join(ROOT, "cms", "studio", "features", "projects", "navigationContract.mjs"));
    ({ resolveProjectNavigation: navigationResolver } = await import(contractUrl.href));
  }
  const navigationContext = navigationResolver
    ? { snapshot: navigationSnapshot, resolver: navigationResolver, projects: [...translations.sv, ...translations.en] }
    : undefined;

  for (const [language, projects] of Object.entries(translations)) {
    for (const project of projects) {
      const output = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].directory, project.slug, "index.html");
      write(output, pageHtml(project, language, translationMaps, languageProjectMaps[language]));
    }
    const overviewFile = path.join(PUBLIC_DIR, LANGUAGE_CONFIG[language].source);
    write(overviewFile, updateOverview(readFile(overviewFile), language, projects, navigationContext));
  }

  write(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemap(translations));
  console.log(`Built ${translations.sv.length + translations.en.length} project pages and sitemap.xml.`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { applyPublishedNavigation, bodyParagraphs, factEntries, loadNavigationSnapshot, pageHtml, projectUrl, updateOverview };
