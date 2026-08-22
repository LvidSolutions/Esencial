const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, ROOT, pageOutputPath } = require("./recovery-utils");

const STATIC_ALTERNATES = {
  "/": { sv: "/", en: "/projects/", "x-default": "/" },
  "/projects/": { sv: "/", en: "/projects/", "x-default": "/" },
  "/om-oss/": { sv: "/om-oss/", en: "/about/", "x-default": "/om-oss/" },
  "/about/": { sv: "/om-oss/", en: "/about/", "x-default": "/om-oss/" }
};
const LANGUAGE_BY_ROUTE = route => route === "/" || route.startsWith("/om-oss/") || route.startsWith("/projekt/") ? "sv" : "en";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function tags(html, expression) {
  return html.match(expression) || [];
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2].trim() : "";
}

function textTag(html, expression) {
  const match = html.match(expression);
  return match ? match[1].trim() : "";
}

function relIncludes(tag, value) {
  return attribute(tag, "rel").toLowerCase().split(/\s+/).includes(value);
}

function canonicalRoute(route) {
  return route === "/" || route.endsWith("/") ? route : `${route}/`;
}

function sitemapRoutes() {
  const xml = read(path.join(PUBLIC_DIR, "sitemap.xml"));
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => new URL(match[1]).pathname).sort();
}

function expectedAlternates(route) {
  if (STATIC_ALTERNATES[route]) return STATIC_ALTERNATES[route];
  const match = route.match(/^\/(projekt|projects)\/([^/]+)\/$/);
  if (!match) return null;
  const slug = match[2];
  return { sv: `/projekt/${slug}/`, en: `/projects/${slug}/`, "x-default": `/projekt/${slug}/` };
}

function absolute(route) {
  return new URL(route, `${BASE_URL}/`).href;
}

function sameHreflangCluster(left, right) {
  return ["sv", "en", "x-default"].every(language => left[language] === right[language]);
}

function contentByLanguage() {
  const result = {};
  for (const language of ["sv", "en"]) {
    const file = path.join(ROOT, "content", "projects", `${language}.json`);
    result[language] = JSON.parse(read(file));
  }
  return result;
}

function recordForRoute(route, content) {
  const match = route.match(/^\/(projekt|projects)\/([^/]+)\/$/);
  if (!match) return null;
  const language = match[1] === "projekt" ? "sv" : "en";
  return content[language].find(project => project.slug === match[2]) || null;
}

function addDuplicateErrors(errors, values, label, language) {
  const locations = new Map();
  for (const entry of values) locations.set(entry.value, [...(locations.get(entry.value) || []), entry.route]);
  for (const [value, routes] of locations) {
    if (value && routes.length > 1) errors.push(`${language}: duplicate ${label} on ${routes.join(", ")}: ${value}`);
  }
}

function evidencePath() {
  const index = process.argv.indexOf("--evidence");
  if (index === -1) return null;
  if (!process.argv[index + 1]) throw new Error("--evidence requires an output path");
  return path.resolve(ROOT, process.argv[index + 1]);
}

function main() {
  const errors = [];
  const warnings = [];
  const content = contentByLanguage();
  const routes = sitemapRoutes();
  const pages = [];
  const sourceIds = new Map();

  for (const language of ["sv", "en"]) {
    for (const project of content[language]) {
      if (!sourceIds.has(project.id)) sourceIds.set(project.id, {});
      sourceIds.get(project.id)[language] = project;
      if (project.descriptionLanguage && !["sv", "en", "es"].includes(project.descriptionLanguage)) {
        errors.push(`${language}/${project.slug}: invalid descriptionLanguage ${project.descriptionLanguage}`);
      }
    }
  }
  for (const [id, pair] of sourceIds) {
    if (!pair.sv || !pair.en) errors.push(`${id}: missing a Swedish or English source record`);
    if (pair.sv && pair.en && pair.sv.slug !== pair.en.slug) errors.push(`${id}: Swedish and English records must retain the same slug`);
  }

  for (const route of routes) {
    const file = pageOutputPath(route);
    const html = read(file);
    const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || "";
    const expectedLanguage = LANGUAGE_BY_ROUTE(route);
    const lang = attribute((html.match(/<html\b[^>]*>/i) || [""])[0], "lang").toLowerCase();
    const titleTags = tags(head, /<title\b[^>]*>[\s\S]*?<\/title>/gi);
    const title = textTag(head, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const meta = tags(head, /<meta\b[^>]*>/gi);
    const descriptionTags = meta.filter(tag => attribute(tag, "name").toLowerCase() === "description");
    const description = descriptionTags.length === 1 ? attribute(descriptionTags[0], "content") : "";
    const properties = property => meta.filter(tag => attribute(tag, "property").toLowerCase() === property);
    const names = name => meta.filter(tag => attribute(tag, "name").toLowerCase() === name);
    const value = collection => collection.length === 1 ? attribute(collection[0], "content") : "";
    const ogTitle = value(properties("og:title"));
    const ogDescription = value(properties("og:description"));
    const ogUrl = value(properties("og:url"));
    const ogImage = value(properties("og:image"));
    const twitterTitle = value(names("twitter:title"));
    const twitterDescription = value(names("twitter:description"));
    const twitterImage = value(names("twitter:image"));
    const canonicalLinks = tags(head, /<link\b[^>]*>/gi).filter(tag => relIncludes(tag, "canonical"));
    const canonical = canonicalLinks.length === 1 ? attribute(canonicalLinks[0], "href") : "";
    const alternates = tags(head, /<link\b[^>]*>/gi)
      .filter(tag => relIncludes(tag, "alternate") && attribute(tag, "hreflang"))
      .map(tag => ({ language: attribute(tag, "hreflang").toLowerCase(), href: attribute(tag, "href") }));
    const expected = expectedAlternates(route);
    const project = recordForRoute(route, content);

    if (lang !== expectedLanguage) errors.push(`${route}: html lang must be ${expectedLanguage}, found ${lang || "missing"}`);
    if (titleTags.length !== 1 || !title) errors.push(`${route}: requires one non-empty title`);
    if (descriptionTags.length !== 1 || !description) errors.push(`${route}: requires one non-empty meta description`);
    if (canonical !== absolute(route)) errors.push(`${route}: canonical must be ${absolute(route)}`);
    if (ogTitle !== title) errors.push(`${route}: og:title must equal title`);
    if (ogDescription !== description) errors.push(`${route}: og:description must equal meta description`);
    if (ogUrl !== canonical) errors.push(`${route}: og:url must equal canonical`);
    if (!/^https:\/\/www\.esencial\.se\//.test(ogImage)) errors.push(`${route}: og:image must be an absolute canonical-host URL`);
    if (twitterTitle !== title) errors.push(`${route}: twitter:title must equal title`);
    if (twitterDescription !== description) errors.push(`${route}: twitter:description must equal meta description`);
    if (!/^https:\/\/www\.esencial\.se\//.test(twitterImage)) errors.push(`${route}: twitter:image must be an absolute canonical-host URL`);

    const alternateMap = new Map();
    for (const alternate of alternates) {
      if (alternateMap.has(alternate.language)) errors.push(`${route}: duplicate hreflang ${alternate.language}`);
      alternateMap.set(alternate.language, alternate.href);
    }
    const expectedKeys = ["sv", "en", "x-default"];
    if (alternateMap.size !== expectedKeys.length || expectedKeys.some(key => !alternateMap.has(key))) {
      errors.push(`${route}: hreflang cluster must contain exactly sv, en, and x-default`);
    }
    if (expected) {
      for (const key of expectedKeys) {
        if (alternateMap.get(key) !== absolute(expected[key])) errors.push(`${route}: hreflang ${key} must be ${absolute(expected[key])}`);
      }
      if (alternateMap.get(expectedLanguage) !== canonical) errors.push(`${route}: self hreflang must equal canonical`);
    }
    if (project && project.descriptionLanguage && project.descriptionLanguage !== expectedLanguage) {
      const visible = new RegExp(`<p\\b[^>]*class=["'][^"']*project-intro__description[^"']*["'][^>]*\\blang=["']${project.descriptionLanguage}["']`, "i");
      if (!visible.test(html)) errors.push(`${route}: visible cross-language description must declare lang=${project.descriptionLanguage}`);
      if (description === project.description) errors.push(`${route}: metadata must use a ${expectedLanguage} fallback while visible description is ${project.descriptionLanguage}`);
    }
    pages.push({ route, language: expectedLanguage, title, description, canonical, alternates: Object.fromEntries(alternateMap) });
  }

  for (const language of ["sv", "en"]) {
    const pagesInLanguage = pages.filter(page => page.language === language);
    addDuplicateErrors(errors, pagesInLanguage.map(page => ({ route: page.route, value: page.title })), "title", language);
    addDuplicateErrors(errors, pagesInLanguage.map(page => ({ route: page.route, value: page.description })), "meta description", language);
  }
  for (const page of pages) {
    for (const target of [page.alternates.sv, page.alternates.en]) {
      const targetRoute = target ? new URL(target).pathname : null;
      const targetPage = pages.find(candidate => candidate.route === targetRoute);
      if (!targetPage) errors.push(`${page.route}: hreflang target is absent from sitemap: ${target || "missing"}`);
      else if (!sameHreflangCluster(targetPage.alternates, page.alternates)) errors.push(`${page.route}: hreflang cluster is not reciprocal with ${targetRoute}`);
    }
  }

  const evidence = {
    status: errors.length ? "failed" : "passed",
    counts: { sitemapPages: pages.length, swedishPages: pages.filter(page => page.language === "sv").length, englishPages: pages.filter(page => page.language === "en").length, crossLanguageVisibleExcerpts: pages.filter(page => { const project = recordForRoute(page.route, content); return project?.descriptionLanguage && project.descriptionLanguage !== page.language; }).length, warnings: warnings.length, errors: errors.length },
    checks: { pairedSourceRecords: !errors.some(error => error.includes("source record") || error.includes("retain the same slug")), exactHreflangClusters: !errors.some(error => error.includes("hreflang")), metadataParity: !errors.some(error => /title|description|og:|twitter:/.test(error)), languageMarkup: !errors.some(error => error.includes("html lang") || error.includes("visible cross-language")) },
    warnings,
    errors
  };
  const output = evidencePath();
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(`International SEO evidence written to ${path.relative(ROOT, output).replace(/\\/g, "/")}.`);
  }
  if (errors.length) {
    console.error("International SEO validation failed:\n- " + errors.join("\n- "));
    process.exit(1);
  }
  console.log(`International SEO validation passed: ${pages.length} pages, ${pages.filter(page => page.language === "sv").length} Swedish, ${pages.filter(page => page.language === "en").length} English.`);
}

main();
