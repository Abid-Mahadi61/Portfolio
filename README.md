# Mohaimen Abid Mahadi — QA Portfolio

A personal portfolio that is **tested by its own Playwright suite**. Every push to `main` runs
cross-browser tests, accessibility checks and Lighthouse audits in GitHub Actions. If everything
passes, the site is deployed to GitHub Pages with the latest test report published at `/report/`.

## What's inside

```
index.html                 the whole site (HTML, CSS and a little JS, no build step)
assets/photo.jpg           profile photo
cv.pdf                     downloadable CV
tests/portfolio.spec.ts    Playwright test suite
playwright.config.ts       Chromium, Firefox, WebKit and mobile Chrome projects
lighthouserc.json          Lighthouse CI score thresholds
.github/workflows/ci.yml   test → Lighthouse → deploy pipeline
```

## What the tests cover

- **Smoke:** page loads, no console errors or failed requests, photo loads, SEO meta description
- **Navigation:** every in-page link has a target, nav links scroll to their sections, external
  links use `rel="noopener"`, the CV download returns a real PDF, the email link is valid
- **Interactions:** theme toggle switches and persists, mobile menu opens/closes (click and Escape),
  the skip link is the first keyboard stop
- **Layout:** no horizontal scroll at 360px, 768px and 1280px; the photo stays square on phones
- **Accessibility:** axe-core WCAG 2.1 AA scan in both dark and light themes
- **Performance:** Lighthouse CI must score 90+ on performance, best practices and SEO, and 95+ on
  accessibility

## Run it locally

You need Node.js 20+ and Python 3.

```bash
npm install
npx playwright install --with-deps
npm start                 # site at http://localhost:4173
npm test                  # full suite, all browsers
npm run test:chromium     # faster, Chromium only
npm run test:ui           # Playwright UI mode
npm run report            # open the last HTML report
```

## Deploy to GitHub Pages

1. Create a public repo on GitHub (e.g. `qa-portfolio`) and push this folder to `main`.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push any change. The workflow tests the site, and when everything passes it deploys to
   `https://<your-username>.github.io/qa-portfolio/`.

## Before you publish

- Replace `YOUR_GITHUB_USERNAME` and `YOUR_LINKEDIN_SLUG` in `index.html`.
- Replace `cv.pdf` with your final CV if you change it (keep the file name).
- When a Labs project goes public, swap its "repo coming soon" label for a link to the repo.
