const assert = require("assert");
const { pageHtml } = require("./build-project-pages");

const swedish = {
  id: "fixture", slug: "fixture", title: "Testprojekt", location: "Stockholm", year: 2024,
  typology: "Kultur", client: "Bekräftad beställare", team: ["A. Arkitekt", "B. Formgivare"], services: ["Förstudie", "Gestaltning"],
  description: "En bekräftad introduktion till testprojektet.",
  body: [{ _type: "block", children: [{ text: "Första bekräftade stycket." }] }, { _type: "block", children: [{ text: "Andra bekräftade stycket." }] }],
  relatedProjectIds: ["related"], images: [{ src: "/fixture.jpg", alt: "Testprojekt, bekräftad bildbeskrivning" }]
};
const english = { ...swedish, title: "Fixture Project", description: "A confirmed introduction to the fixture project.", location: "Stockholm, Sweden" };
const relatedSwedish = { id: "related", slug: "related", title: "Relaterat projekt", location: "Göteborg", description: "Bekräftad introduktion.", images: [{ src: "/related.jpg", alt: "Relaterad bild" }] };
const relatedEnglish = { ...relatedSwedish, title: "Related project", location: "Gothenburg" };
const translations = { sv: new Map([["fixture", swedish], ["related", relatedSwedish]]), en: new Map([["fixture", english], ["related", relatedEnglish]]) };

const html = pageHtml(swedish, "sv", translations, translations.sv);
for (const expected of ["<dt>År</dt><dd>2024</dd>", "<dt>Typologi</dt><dd>Kultur</dd>", "A. Arkitekt, B. Formgivare", "<section class=\"project-narrative\"", "Första bekräftade stycket.", "<section class=\"project-related\"", "href=\"/projekt/related/\""]) assert.ok(html.includes(expected), `Missing expected project-page architecture output: ${expected}`);
assert.ok(!pageHtml({ ...swedish, body: undefined, relatedProjectIds: [] }, "sv", translations, translations.sv).includes('class="project-narrative"'), "An empty optional narrative must be omitted.");
console.log("Project-page architecture fixture passed: facts, narrative, and editorial related-project links render only from confirmed source data.");
