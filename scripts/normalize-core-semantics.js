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
  const original = html;

  const labels = page.language === "sv"
    ? { primary: "Huvudnavigering", secondary: "Sociala länkar och språk", mobile: "Mobil navigering" }
    : { primary: "Primary navigation", secondary: "Social links and language", mobile: "Mobile navigation" };
  const mainMarker = page.pageType === "projects" ? '<div class="css_tag_container">' : '<div class="css_about_container">';

  if (!html.includes('data-semantic-core="true"')) {
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
  }

  html = html.replace(/<meta name="viewport" content="width=device-width, initial-scale=1\.0, maximum-scale=1\.0, user-scalable=no">/i, '<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (!html.includes('class="skip-link"')) {
    const label = page.language === "sv" ? "Hoppa till innehållet" : "Skip to content";
    html = replaceOnce(html, '<body class="bg-white">', `<body class="bg-white">\n<a class="skip-link" href="#main-content">${label}</a>`, page.file);
  }
  html = html.replace(/<button type="button" class="css_tag_item (css_tag_item_(?:in)?active)" data-tag="([^"]+)" aria-pressed="(?:true|false)">([\s\S]*?)<\/button>/g, '<div class="css_tag_item $1" data-tag="$2" role="button" tabindex="0" aria-pressed="false">$3</div>');
  html = html.replace(/<div class="\s*css_tag_item\s+(css_tag_item_(?:in)?active)" data-tag="([^"]+)">([\s\S]*?)<\/div>/g, '<div class="css_tag_item $1" data-tag="$2" role="button" tabindex="0" aria-pressed="false">$3</div>');
  html = html.replace(/<a class=" css_nav_wrapper " href="([^"]+)"(?! aria-label)/g, '<a class=" css_nav_wrapper " href="$1" aria-label="Esencial"');
  html = html.replace(/href="https:\/\/www\.instagram\.com\/esencial_se\/" target="_blank"(?! aria-label)/g, 'href="https://www.instagram.com/esencial_se/" target="_blank" aria-label="Instagram"');
  html = html.replace(/href="https:\/\/www\.facebook\.com\/esencialarkitekter\/" target="_blank"(?! aria-label)/g, 'href="https://www.facebook.com/esencialarkitekter/" target="_blank" aria-label="Facebook"');

  if (html !== original) fs.writeFileSync(file, html);
  return html !== original;
}

let changed = 0;
for (const page of PAGES) if (normalizePage(page)) changed += 1;
console.log(`Semantic core normalization complete: ${changed} page(s) updated, ${PAGES.length} page(s) checked.`);
