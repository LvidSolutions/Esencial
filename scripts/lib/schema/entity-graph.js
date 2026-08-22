const { BASE_URL } = require("../../recovery-utils");

const ORGANIZATION_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;
const SUPPORTED_LANGUAGES = new Set(["sv", "en"]);
const SUPPORTED_PAGE_TYPES = new Set(["WebPage", "AboutPage", "CollectionPage"]);

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function absoluteSiteUrl(value, label) {
  const url = new URL(requiredText(value, label), `${BASE_URL}/`);
  if (url.origin !== new URL(BASE_URL).origin) throw new Error(`${label} must use the canonical Esencial origin: ${url.href}`);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS: ${url.href}`);
  return url.href;
}

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Esencial",
    legalName: "Esencial AB",
    url: `${BASE_URL}/`
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${BASE_URL}/`,
    name: "Esencial",
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: ["sv", "en"]
  };
}

function buildPageGraph({
  pageType = "WebPage",
  canonicalUrl,
  title,
  description,
  language,
  primaryImage,
  project = null,
  breadcrumbs = []
}) {
  if (!SUPPORTED_PAGE_TYPES.has(pageType)) throw new Error(`Unsupported page type: ${pageType}`);
  if (!SUPPORTED_LANGUAGES.has(language)) throw new Error(`Unsupported page language: ${language}`);

  const canonical = absoluteSiteUrl(canonicalUrl, "canonicalUrl");
  const imageUrl = absoluteSiteUrl(primaryImage, "primaryImage");
  const pageId = `${canonical}#webpage`;
  const imageId = `${canonical}#primaryimage`;
  const page = {
    "@type": pageType,
    "@id": pageId,
    url: canonical,
    name: requiredText(title, "title"),
    description: requiredText(description, "description"),
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: language,
    primaryImageOfPage: { "@id": imageId },
    image: { "@id": imageId }
  };
  const image = {
    "@type": "ImageObject",
    "@id": imageId,
    url: imageUrl,
    contentUrl: imageUrl
  };
  const graph = [organizationNode(), websiteNode(), image, page];

  if (project) {
    const projectId = `${canonical}#project`;
    const projectImages = [...new Set((project.images || []).map((value) => absoluteSiteUrl(value, "project image")))];
    if (!projectImages.length) throw new Error(`Project ${project.name || canonical} requires at least one approved image.`);
    const creativeWork = {
      "@type": "CreativeWork",
      "@id": projectId,
      url: canonical,
      name: requiredText(project.name, "project.name"),
      description: requiredText(project.description, "project.description"),
      inLanguage: language,
      image: projectImages,
      creator: { "@id": ORGANIZATION_ID },
      mainEntityOfPage: { "@id": pageId }
    };
    page.about = { "@id": projectId };
    page.mainEntity = { "@id": projectId };
    graph.push(creativeWork);
  } else {
    page.about = { "@id": ORGANIZATION_ID };
  }

  if (breadcrumbs.length) {
    if (!project || breadcrumbs.length < 2) throw new Error("Breadcrumb schema is only emitted for visible project breadcrumb trails.");
    const breadcrumbId = `${canonical}#breadcrumb`;
    const breadcrumb = {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: requiredText(item.name, `breadcrumbs[${index}].name`),
        item: absoluteSiteUrl(item.url, `breadcrumbs[${index}].url`)
      }))
    };
    page.breadcrumb = { "@id": breadcrumbId };
    graph.push(breadcrumb);
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function serializeStructuredData(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

module.exports = {
  ORGANIZATION_ID,
  WEBSITE_ID,
  buildPageGraph,
  organizationNode,
  serializeStructuredData,
  websiteNode
};
