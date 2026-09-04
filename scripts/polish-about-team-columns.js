const fs = require('node:fs')
const path = require('node:path')

const pages = [
  {file: path.join('public', 'om-oss', 'index.html'), label: 'MEDARBETARE'},
  {file: path.join('public', 'about', 'index.html'), label: 'COLLABORATORS'},
]

const styleId = 'esencial-team-columns'
const styles = `<style id="${styleId}">
/* Keep the team roster as two real aligned columns instead of tab-like inline spacing. */
@media screen and (min-width: 40em) {
  .css_about_team_wrapper {
    display: grid !important;
    width: auto !important;
    grid-template-columns: max-content max-content;
    column-gap: clamp(4rem, 4.5vw, 8rem);
    align-items: start;
    padding-left: 4rem;
  }
  .css_about_team_wrapper > .css_about_info_label {
    grid-column: 1 / -1;
    padding-left: 0 !important;
  }
  .css_about_team_wrapper > .css_about_info_item {
    width: auto !important;
    min-width: 0;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}
@media screen and (max-width: 39.999em) {
  .css_about_team_wrapper {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 2rem;
  }
  .css_about_team_wrapper > .css_about_info_label {
    grid-column: 1 / -1;
  }
  .css_about_team_wrapper > .css_about_info_item {
    width: auto !important;
    min-width: 0;
  }
}
</style>`

function markTeamWrapper(html, label) {
  const alreadyMarked = new RegExp(
    `<div class="[^"]*css_about_team_wrapper[^"]*">\\s*<h2 class="css_about_info_label">${label}</h2>`,
  )
  if (alreadyMarked.test(html)) return html

  const target = new RegExp(
    `<div class="css_about_info_wrapper w-50">(\\s*<h2 class="css_about_info_label">${label}</h2>)`,
  )
  if (!target.test(html)) throw new Error(`Could not find ${label} team wrapper`)
  return html.replace(target, '<div class="css_about_info_wrapper css_about_team_wrapper w-50">$1')
}

for (const {file, label} of pages) {
  let html = fs.readFileSync(file, 'utf8')
  html = markTeamWrapper(html, label)
  if (!html.includes(`id="${styleId}"`)) {
    if (!html.includes('</head>')) throw new Error(`${file} has no </head>`)
    html = html.replace('</head>', `${styles}\n</head>`)
  }
  fs.writeFileSync(file, html)
}

console.log('About team roster: two aligned columns applied to SV and EN pages.')
