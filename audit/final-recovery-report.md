# Esencial.se Static Recovery Report

## 1. Summary

Recovered a static local copy of the current public `https://www.esencial.se` frontend for the four visible routes requested. The local copy renders correctly from `public/` and preserves the WordPress-style frontend structure, assets, metadata, `noindex`, scripts, typography, spacing, and page behavior.

## 2. Repository Used

- Local path: `C:\Users\andreas.hiller\Desktop\Lucas Lvid solutions\Esencial`
- GitHub repo: `https://github.com/LvidSolutions/Esencial`
- Branch: `main`
- Changes were left as working tree changes only. Nothing was committed, pushed, or opened as a pull request.

## 3. Pages Copied

- `/`
- `/om-oss/`
- `/projects/`
- `/about/`

## 4. Assets Copied

Copied 134 public rendering assets, including CSS, JavaScript, WordPress upload images, theme files, plugin files, favicon, Google font CSS, and Roboto font files. Original WordPress-style paths were preserved where useful, especially under `/wp-content/`.

## 5. Missing or Problematic Assets

No missing rendering assets remain in `audit/missing-assets.md`.

## 6. Visual Accuracy Notes

Playwright captured 24 live/local screenshot pairs across:

- Desktop: `1440x1200`, `1280x1000`, `1024x900`
- Mobile: `430x932`, `390x844`, `375x812`

Maximum visual diff after fixes: `1.0365%`. Several home/projects captures were `0%` or near `0%`. Remaining small differences are concentrated on about/om-oss text/news pages and appear consistent with antialiasing and live rendering variation.

Screenshot folders:

- `screenshots/live/`
- `screenshots/local/`
- `screenshots/diff/`

Report:

- `audit/visual-diff-report.md`

## 7. Computed Style / Layout Notes

Computed styles matched for inspected key elements including body, header, nav, logo SVG, tag filters, grid containers/cards/text, social icons, paragraphs, and footer.

Bounding boxes matched for inspected key elements at `1440x1200`, with zero meaningful deltas for present elements.

Reports:

- `audit/computed-style-report.md`
- `audit/bounding-box-report.md`

## 8. Functionality Notes

Playwright checked local navigation and mobile behavior. All recovered routes returned `200`:

- `/`
- `/om-oss/`
- `/projects/`
- `/about/`

Visible link hover checks passed and no console errors were captured during local functionality checks.

Report:

- `audit/functionality-report.md`

## 9. Technical Clues Found

Confirmed WordPress traces include `wp-content`, `wp-includes`, `wp-content/plugins`, `wp-content/themes/esencial`, WordPress generator metadata, ExactMetrics/Google Analytics traces, and `noindex, nofollow` metadata. These were preserved and not cleaned up.

See:

- `audit/scrape-notes.md`

## 10. Files Created

- `public/`
- `public/index.html`
- `public/om-oss/index.html`
- `public/projects/index.html`
- `public/about/index.html`
- `public/assets/`
- `public/wp-content/`
- `public/wp-includes/`
- `scripts/`
- `screenshots/live/`
- `screenshots/local/`
- `screenshots/diff/`
- `audit/`
- `README.md`
- `package.json`
- `pnpm-lock.yaml`
- `.gitignore`

## 11. How to Run Locally

```bash
npm run serve
```

Open:

```txt
http://127.0.0.1:3000/
```

If Node is not on PATH, use:

```powershell
& "C:\Users\andreas.hiller\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\static-server.js
```

## 12. Git Status

The repository has uncommitted working tree changes only. `node_modules/` is ignored by `.gitignore`.

## 13. Recommended Next Step

Static recovery is complete. I will wait for the next instructions before starting CMS, SEO, or frontend restructuring work.
