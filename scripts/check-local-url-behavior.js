const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR, ROOT, startStaticServer } = require("./recovery-utils");

const PORT = Number(process.env.TECHNICAL_SEO_PORT || 3213);
const ORIGIN = `http://127.0.0.1:${PORT}`;

function readSitemapRoutes() {
  const xml = fs.readFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => new URL(match[1]).pathname);
}

function evidencePath() {
  const index = process.argv.indexOf("--evidence");
  if (index === -1) return null;
  if (!process.argv[index + 1]) throw new Error("--evidence requires an output path");
  return path.resolve(ROOT, process.argv[index + 1]);
}

async function request(pathname) {
  const response = await fetch(`${ORIGIN}${pathname}`, { redirect: "manual" });
  return {
    path: pathname,
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    body: await response.text()
  };
}

function assert(errors, condition, message) {
  if (!condition) errors.push(message);
}

async function main() {
  const server = await startStaticServer(PORT);
  const errors = [];
  try {
    const routes = readSitemapRoutes();
    const canonicalResponses = await Promise.all(routes.map(request));
    const slashlessRoutes = routes.filter(route => route !== "/").map(route => route.slice(0, -1));
    const slashlessResponses = await Promise.all(slashlessRoutes.map(request));
    const [missing, uppercase, queryRedirect, robots, sitemap] = await Promise.all([
      request("/definitely-not-real-stage3-test/"),
      request("/PROJEKT/"),
      request("/projects?utm_source=stage3"),
      request("/robots.txt"),
      request("/sitemap.xml")
    ]);

    for (const response of canonicalResponses) {
      assert(errors, response.status === 200, `${response.path} must return 200, received ${response.status}`);
      assert(errors, /^text\/html\b/i.test(response.contentType || ""), `${response.path} must return text/html`);
    }
    for (const response of slashlessResponses) {
      assert(errors, response.status === 308, `${response.path} must return 308, received ${response.status}`);
      assert(errors, response.location === `${response.path}/`, `${response.path} must redirect to ${response.path}/`);
    }
    assert(errors, missing.status === 404, `missing URL must return 404, received ${missing.status}`);
    assert(errors, !/<link\b[^>]*rel=["']canonical["']/i.test(missing.body), "404 response must not look like a canonical indexable page");
    assert(errors, uppercase.status === 404, `uppercase duplicate must return 404, received ${uppercase.status}`);
    assert(errors, queryRedirect.status === 308, `slashless query URL must return 308, received ${queryRedirect.status}`);
    assert(errors, queryRedirect.location === "/projects/?utm_source=stage3", "slash redirect must preserve the query string");
    assert(errors, robots.status === 200, `robots.txt must return 200, received ${robots.status}`);
    assert(errors, /^text\/plain\b/i.test(robots.contentType || ""), "robots.txt must return text/plain");
    assert(errors, sitemap.status === 200, `sitemap.xml must return 200, received ${sitemap.status}`);
    assert(errors, /^(?:application|text)\/xml\b/i.test(sitemap.contentType || ""), "sitemap.xml must return an XML content type");

    const evidence = {
      status: errors.length ? "failed" : "passed",
      counts: {
        canonical200Responses: canonicalResponses.filter(response => response.status === 200).length,
        canonicalRoutes: routes.length,
        slashless308Responses: slashlessResponses.filter(response => response.status === 308).length,
        slashlessRoutes: slashlessRoutes.length,
        errors: errors.length
      },
      checks: {
        canonicalRoutesReturn200: canonicalResponses.every(response => response.status === 200),
        slashlessRoutesReturn308: slashlessResponses.every(response => response.status === 308),
        missingRouteReturns404: missing.status === 404,
        uppercaseRouteReturns404: uppercase.status === 404,
        queryPreservedAcrossRedirect: queryRedirect.location === "/projects/?utm_source=stage3",
        robotsReturnsText200: robots.status === 200 && /^text\/plain\b/i.test(robots.contentType || ""),
        sitemapReturnsXml200: sitemap.status === 200 && /^(?:application|text)\/xml\b/i.test(sitemap.contentType || "")
      },
      errors
    };
    const output = evidencePath();
    if (output) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
      console.log(`HTTP SEO evidence written to ${path.relative(ROOT, output).replace(/\\/g, "/")}.`);
    }
    if (errors.length) {
      console.error("Local URL behavior validation failed:");
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Local URL behavior passed: ${routes.length} canonical 200 responses, ${slashlessRoutes.length} slash redirects, correct 404s and crawler resource types.`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
