const fs = require("fs");
const path = require("path");
const { BASE_URL, PUBLIC_DIR, pageOutputPath } = require("./recovery-utils");
const { ORGANIZATION_ID, WEBSITE_ID } = require("./lib/schema/entity-graph");

const CANONICAL_ORIGIN = new URL(BASE_URL).origin;
const CORE_PAGE_TYPES = {
  "/": "CollectionPage",
  "/projects/": "CollectionPage",
  "/om-oss/": "AboutPage",
  "/about/": "AboutPage"
};
const FORBIDDEN_TYPES = new Set([
  "AggregateRating",
  "LocalBusiness",
  "Offer",
  "PostalAddress",
  "Product",
  "ProfessionalService",
  "Rating",
  "Review",
  "SearchAction",
  "Service"
]);
const FORBIDDEN_PROPERTIES = new Set([
  "address",
  "aggregateRating",
  "areaServed",
  "award",
  "awards",
  "client",
  "employee",
  "founder",
  "knowsAbout",
  "makesOffer",
  "potentialAction",
  "review",
  "serviceType"
]);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function decodeHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|apos|quot|lt|gt|auml|ouml|aring);/gi, (_, entity) => ({
      amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", auml: "ä", ouml: "ö", aring: "å"
    }[entity.toLowerCase()]))
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? decodeHtml(match[2]) : "";
}

function fail(errors, route, message) {
  errors.push(`${route}: ${message}`);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exactKeys(value, expected, errors, route, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!sameJson(actual, wanted)) fail(errors, route, `${label} keys must be [${wanted.join(", ")}], found [${actual.join(", ")}]`);
}

function validateSiteUrl(value, errors, route, label, { allowFragment = false, requirePage = false, requireImage = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(errors, route, `${label} is not an absolute URL: ${value}`);
    return null;
  }
  if (url.origin !== CANONICAL_ORIGIN) fail(errors, route, `${label} must use ${CANONICAL_ORIGIN}: ${value}`);
  if (url.protocol !== "https:") fail(errors, route, `${label} must use HTTPS: ${value}`);
  if (url.username || url.password || url.search) fail(errors, route, `${label} must not contain credentials or a query: ${value}`);
  if (!allowFragment && url.hash) fail(errors, route, `${label} must not contain a fragment: ${value}`);
  if (requirePage && !fs.existsSync(pageOutputPath(url.pathname))) fail(errors, route, `${label} page target does not exist: ${value}`);
  if (requireImage) {
    const imageFile = path.join(PUBLIC_DIR, decodeURIComponent(url.pathname).replace(/^\/+/, ""));
    if (!fs.existsSync(imageFile) || !fs.statSync(imageFile).isFile()) fail(errors, route, `${label} image target does not exist: ${value}`);
  }
  return url;
}

function sitemapRoutes(errors) {
  const xml = read(path.join(PUBLIC_DIR, "sitemap.xml"));
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
  if (urls.length !== 56) errors.push(`sitemap.xml: expected 56 indexable URLs, found ${urls.length}`);
  if (new Set(urls).size !== urls.length) errors.push("sitemap.xml: structured-data coverage cannot be verified because URLs are duplicated");
  return urls.map((value) => {
    const url = validateSiteUrl(value, errors, "sitemap.xml", "URL", { requirePage: true });
    return url?.pathname;
  }).filter(Boolean);
}

function pageMetadata(html, route, errors) {
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || "";
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [])[0] || "";
  const title = decodeHtml((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const h1 = decodeHtml((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  const metaTags = head.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = head.match(/<link\b[^>]*>/gi) || [];
  const description = attribute(metaTags.find((tag) => attribute(tag, "name").toLowerCase() === "description") || "", "content");
  const primaryImage = attribute(metaTags.find((tag) => attribute(tag, "property").toLowerCase() === "og:image") || "", "content");
  const canonical = attribute(linkTags.find((tag) => attribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical")) || "", "href");
  const language = attribute(htmlTag, "lang").toLowerCase();
  for (const [label, value] of Object.entries({ title, h1, description, primaryImage, canonical, language })) {
    if (!value) fail(errors, route, `visible/head metadata is missing ${label}`);
  }
  return { title, h1, description, primaryImage, canonical, language };
}

function structuredData(html, route, errors) {
  const tags = html.match(/<script\b(?=[^>]*\btype\s*=\s*(["'])application\/ld\+json\1)[^>]*>[\s\S]*?<\/script>/gi) || [];
  if (tags.length !== 1) {
    fail(errors, route, `expected exactly one JSON-LD block, found ${tags.length}`);
    return null;
  }
  const source = tags[0].replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(errors, route, `JSON-LD is not parseable: ${error.message}`);
    return null;
  }
}

function validateForbiddenClaims(value, errors, route, location = "graph") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateForbiddenClaims(item, errors, route, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]].filter(Boolean);
  for (const type of types) if (FORBIDDEN_TYPES.has(type)) fail(errors, route, `${location} uses unsupported type ${type}`);
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_PROPERTIES.has(key)) fail(errors, route, `${location} uses unsupported property ${key}`);
    validateForbiddenClaims(nested, errors, route, `${location}.${key}`);
  }
}

function validateStableEntities(nodes, errors, route) {
  const organization = nodes.get(ORGANIZATION_ID);
  const website = nodes.get(WEBSITE_ID);
  const expectedOrganization = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Esencial",
    legalName: "Esencial AB",
    url: `${BASE_URL}/`
  };
  const expectedWebsite = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${BASE_URL}/`,
    name: "Esencial",
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: ["sv", "en"]
  };
  if (!sameJson(organization, expectedOrganization)) fail(errors, route, "Organization entity differs from the approved site-wide Esencial identity");
  if (!sameJson(website, expectedWebsite)) fail(errors, route, "WebSite entity differs from the approved site-wide website identity");
}

function visibleBreadcrumb(html) {
  const body = (html.match(/<nav\b[^>]*class=["'][^"']*\bproject-breadcrumb\b[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i) || [])[1];
  if (!body) return null;
  const link = (body.match(/<a\b[^>]*>[\s\S]*?<\/a>/i) || [])[0] || "";
  const spans = [...body.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => decodeHtml(match[1])).filter((value) => value && value !== "/");
  return { name: decodeHtml(link), href: attribute(link, "href"), current: spans.at(-1) || "" };
}

function visibleImageUrls(html) {
  return new Set((html.match(/<img\b[^>]*>/gi) || []).map((tag) => attribute(tag, "src")).filter(Boolean).map((src) => new URL(src, `${BASE_URL}/`).href));
}

function validatePage(route, counters, errors) {
  const file = pageOutputPath(route);
  const html = read(file);
  const meta = pageMetadata(html, route, errors);
  const data = structuredData(html, route, errors);
  if (!data) return;
  if (data["@context"] !== "https://schema.org") fail(errors, route, "@context must be https://schema.org");
  if (!Array.isArray(data["@graph"])) {
    fail(errors, route, "JSON-LD root must contain an @graph array");
    return;
  }
  validateForbiddenClaims(data, errors, route);

  const graphNodes = data["@graph"];
  const identifiers = graphNodes.map((node) => node?.["@id"]);
  if (identifiers.some((identifier) => !identifier)) fail(errors, route, "every top-level graph node must have an @id");
  if (new Set(identifiers).size !== identifiers.length) fail(errors, route, "top-level graph node @id values must be unique");
  const nodes = new Map(graphNodes.map((node) => [node["@id"], node]));
  validateStableEntities(nodes, errors, route);

  const canonical = meta.canonical;
  const pageId = `${canonical}#webpage`;
  const imageId = `${canonical}#primaryimage`;
  const page = nodes.get(pageId);
  const image = nodes.get(imageId);
  const isProject = /^\/(projekt|projects)\/[^/]+\/$/.test(route);
  const expectedPageType = CORE_PAGE_TYPES[route] || "WebPage";
  const expectedPageKeys = ["@type", "@id", "url", "name", "description", "isPartOf", "publisher", "inLanguage", "primaryImageOfPage", "image", "about"];
  if (isProject) expectedPageKeys.push("mainEntity", "breadcrumb");

  if (!page) fail(errors, route, `missing page entity ${pageId}`);
  if (!image) fail(errors, route, `missing primary image entity ${imageId}`);
  if (!page || !image) return;
  exactKeys(page, expectedPageKeys, errors, route, "WebPage");
  exactKeys(image, ["@type", "@id", "url", "contentUrl"], errors, route, "ImageObject");
  if (page["@type"] !== expectedPageType) fail(errors, route, `page @type must be ${expectedPageType}, found ${page["@type"]}`);
  if (page.url !== canonical || page.name !== meta.title || page.description !== meta.description || page.inLanguage !== meta.language) {
    fail(errors, route, "page URL, name, description, or language differs from canonical visible metadata");
  }
  if (!sameJson(page.isPartOf, { "@id": WEBSITE_ID }) || !sameJson(page.publisher, { "@id": ORGANIZATION_ID })) {
    fail(errors, route, "page must reference the shared WebSite and Organization entities");
  }
  if (!sameJson(page.primaryImageOfPage, { "@id": imageId }) || !sameJson(page.image, { "@id": imageId })) {
    fail(errors, route, "page image references must point to its primary ImageObject");
  }
  if (image["@type"] !== "ImageObject" || image.url !== meta.primaryImage || image.contentUrl !== meta.primaryImage) {
    fail(errors, route, "primary ImageObject must match the page's Open Graph image");
  }
  validateSiteUrl(canonical, errors, route, "page canonical", { requirePage: true });
  validateSiteUrl(image.contentUrl, errors, route, "primary image", { requireImage: true });
  counters.pageImages += 1;
  counters.languages[meta.language] = (counters.languages[meta.language] || 0) + 1;

  if (!isProject) {
    if (graphNodes.length !== 4) fail(errors, route, `core graph must contain 4 nodes, found ${graphNodes.length}`);
    if (!sameJson(page.about, { "@id": ORGANIZATION_ID })) fail(errors, route, "core page must be about the shared Organization entity");
    return;
  }

  const projectId = `${canonical}#project`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const project = nodes.get(projectId);
  const breadcrumb = nodes.get(breadcrumbId);
  if (!project) fail(errors, route, `missing project CreativeWork entity ${projectId}`);
  if (!breadcrumb) fail(errors, route, `missing visible breadcrumb entity ${breadcrumbId}`);
  if (!project || !breadcrumb) return;
  if (graphNodes.length !== 6) fail(errors, route, `project graph must contain 6 nodes, found ${graphNodes.length}`);
  exactKeys(project, ["@type", "@id", "url", "name", "description", "inLanguage", "image", "creator", "mainEntityOfPage"], errors, route, "CreativeWork");
  exactKeys(breadcrumb, ["@type", "@id", "itemListElement"], errors, route, "BreadcrumbList");
  if (project["@type"] !== "CreativeWork" || project.url !== canonical || project.name !== meta.h1 || project.description !== meta.description || project.inLanguage !== meta.language) {
    fail(errors, route, "CreativeWork type, URL, name, description, or language differs from the visible project page");
  }
  if (!sameJson(project.creator, { "@id": ORGANIZATION_ID }) || !sameJson(project.mainEntityOfPage, { "@id": pageId })) {
    fail(errors, route, "CreativeWork must reference the shared Organization and containing WebPage");
  }
  if (!sameJson(page.about, { "@id": projectId }) || !sameJson(page.mainEntity, { "@id": projectId }) || !sameJson(page.breadcrumb, { "@id": breadcrumbId })) {
    fail(errors, route, "WebPage must reference its CreativeWork and visible BreadcrumbList");
  }
  if (!Array.isArray(project.image) || !project.image.length || project.image[0] !== meta.primaryImage) {
    fail(errors, route, "CreativeWork images must be a non-empty list beginning with the page's primary image");
  }
  const visibleImages = visibleImageUrls(html);
  for (const [index, value] of (project.image || []).entries()) {
    validateSiteUrl(value, errors, route, `CreativeWork image ${index + 1}`, { requireImage: true });
    if (!visibleImages.has(value)) fail(errors, route, `CreativeWork image ${value} is not visibly rendered on the page`);
  }

  const visible = visibleBreadcrumb(html);
  const items = breadcrumb.itemListElement;
  if (breadcrumb["@type"] !== "BreadcrumbList" || !visible || !Array.isArray(items) || items.length !== 2) {
    fail(errors, route, "BreadcrumbList must reflect the two-item visible project breadcrumb");
  } else {
    const overviewUrl = new URL(visible.href, canonical).href;
    const expectedItems = [
      { "@type": "ListItem", position: 1, name: visible.name, item: overviewUrl },
      { "@type": "ListItem", position: 2, name: visible.current, item: canonical }
    ];
    if (!sameJson(items, expectedItems)) fail(errors, route, "BreadcrumbList items differ from the visible breadcrumb labels and links");
    items.forEach((item, index) => {
      exactKeys(item, ["@type", "position", "name", "item"], errors, route, `Breadcrumb ListItem ${index + 1}`);
      validateSiteUrl(item.item, errors, route, `breadcrumb item ${index + 1}`, { requirePage: true });
    });
  }
  counters.creativeWorks += 1;
  counters.breadcrumbs += 1;
}

function main() {
  const errors = [];
  const counters = { pages: 0, pageImages: 0, creativeWorks: 0, breadcrumbs: 0, languages: {} };
  const routes = sitemapRoutes(errors);
  for (const route of routes) {
    validatePage(route, counters, errors);
    counters.pages += 1;
  }

  if (counters.pages !== 56) errors.push(`coverage: expected 56 pages, checked ${counters.pages}`);
  if (counters.pageImages !== 56) errors.push(`coverage: expected 56 primary page images, validated ${counters.pageImages}`);
  if (counters.creativeWorks !== 52) errors.push(`coverage: expected 52 project CreativeWork entities, validated ${counters.creativeWorks}`);
  if (counters.breadcrumbs !== 52) errors.push(`coverage: expected 52 visible project breadcrumb trails, validated ${counters.breadcrumbs}`);
  if (counters.languages.sv !== 28 || counters.languages.en !== 28) {
    errors.push(`coverage: expected 28 Swedish and 28 English graphs, validated ${counters.languages.sv || 0} Swedish and ${counters.languages.en || 0} English`);
  }

  if (errors.length) {
    console.error("Structured-data validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log("Structured-data validation passed: 56 pages, 52 CreativeWork entities, 52 visible breadcrumb trails, 56 primary images, and one consistent Organization/WebSite entity pair.");
}

if (require.main === module) main();

module.exports = { main, structuredData, validatePage };
