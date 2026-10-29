# GitHub Pages — Regest

Site URL: **https://selfisz.github.io/egzepost/**  
(Product name: **Regest**; path unchanged.)

## Root cause of the blank page

Pages was set to **Deploy from branch → `main` / (root)**. That publishes the Vite **source** `index.html`, which loads `/src/main.tsx`. Browsers cannot run that on Pages → white screen (JS 404).

The built PWA lives on the **`gh-pages`** branch (base `/egzepost/`).

## One-time Settings (repo owner)

You need this once (API returns 403 for the bot):

1. Open **https://github.com/selfisz/egzepost/settings/pages**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. **Branch:** `gh-pages`
4. **Folder:** `/ (root)`
5. Click **Save**

Wait 1–2 minutes for the build, then open the site.

## After deploy — hard refresh

If you still see a blank page or an old shell:

1. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (macOS)
2. Or DevTools → Application → Service Workers → **Unregister**, then reload
3. Or open the URL in a private window

## Automatic deploys

Pushing to `main` runs `.github/workflows/deploy-pages.yml`:

- `npm run build:pages` (`BASE_PATH=/egzepost/`)
- copies `404.html` (SPA fallback)
- publishes `dist/` to `gh-pages` via `peaceiris/actions-gh-pages`

Manual: **Actions → Deploy GitHub Pages → Run workflow**.
