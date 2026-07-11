const {execFileSync} = require('child_process');
const path = require('path');

const scripts = [
  'fetch-sanity-content.js',
  'build-project-pages.js',
  'check-cms-content.js',
  'check-seo.js',
  'check-internal-links.js',
];

for (const script of scripts) {
  execFileSync(process.execPath, [path.join(__dirname, script)], {
    stdio: 'inherit',
    env: {...process.env, CONTENT_SOURCE: 'sanity'},
  });
}
