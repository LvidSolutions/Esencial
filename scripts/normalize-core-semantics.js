const fs = require("fs");
const path = require("path");
const { PUBLIC_DIR } = require("./recovery-utils");

const PAGES = [
  { file: "index.html", language: "sv", pageType: "projects" },
  { file: path.join("projects", "index.html"), language: "en", pageType: "projects" },
  { file: path.join("om-oss", "index.html"), language: "sv", pageType: "about" },
  { file: path.join("about", "index.html"), language: "en", pageType: "about" }
];

function replaceOnce(html, from, to, file) {
  const expression = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\r?\\n"));
  if (!expression.test(html)) throw new Error(`Expected semantic source marker was not found in ${file}: ${from}`);
  return html.replace(expression, to);
}

function normalizePage(page) {
  const file = path.join(PUBLIC_DIR, page.file);
  let html = fs.readFileSync(file, "utf8");
  if (html.includes('data-semantic-core="true"')) return false;

  const labels = page.language === "sv"
    ? { primary: "Huvudnavigering", secondary: "Sociala länkar och språk", mobile: "Mobil navigering" }
    : { primary: "Primary navigation", secondary: "Social links and language", mobile: "Mobile navigation" };
  const mainMarker = page.pageType === "projects" ? '<div class="css_tag_container">' : '<div class="css_about_container">';

  html = replaceOnce(html, '<div class=" css_mobile_menu "></div>', `<nav class=" css_mobile_menu " aria-label="${labels.mobile}"></nav>`, page.file);
  html = replaceOnce(html, '<div class=" css_header ">', '<header class=" css_header " data-semantic-core="true">', page.file);
  html = replaceOnce(html, '<div class=" css_nav_container ">', `<nav class=" css_nav_container " aria-label="${labels.primary}">`, page.file);
  html = replaceOnce(html, '</div>\n<div class=" css_nav_footer_container ">', `</nav>\n<nav class=" css_nav_footer_container " aria-label="${labels.secondary}">`, page.file);
  html = replaceOnce(html, `</div>\n${mainMarker}`, `</nav>\n</header>\n<main id="main-content">\n${mainMarker}`, page.file);

  if (page.pageType === "projects") {
    html = replaceOnce(html, '<script>var jsonPhoto = [];', '</main>\n<script>var jsonPhoto = [];', page.file);
  } else {
    const finalContainer = '\n</div>\n<script type="text/javascript" src="/wp-content/themes/esencial/scripts.js';
    html = replaceOnce(html, finalContainer, '\n</main>\n<script type="text/javascript" src="/wp-content/themes/esencial/scripts.js', page.file);
    html = html.replace(/<div class="css_about_info_label">([\s\S]*?)<\/div>/g, '<h2 class="css_about_info_label">$1</h2>');
  }

  fs.writeFileSync(file, html);
  return true;
}

let changed = 0;
for (const page of PAGES) if (normalizePage(page)) changed += 1;
console.log(`Semantic core normalization complete: ${changed} page(s) updated, ${PAGES.length} page(s) checked.`);
