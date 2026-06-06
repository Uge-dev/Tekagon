## Quick guide for AI coding agents

Purpose: help an AI agent be immediately productive in this small static site + SPA-like dashboard codebase.

- Entry point: `index.html` at the repo root. Static assets live in `Images/`, fonts in `webfonts/`, and pages in `pages/`.
- Primary JS: `styles/dashboard.js` implements a lightweight client-side page builder (single-page behavior) using a `pageData` map and DOM injection into `#page`.
- Service styling: `styles/service.css` contains the theming and CSS variables (see `:root` vars such as `--accent`, `--muted`). The service page HTML is dynamically appended by `dashboard.js` under the `.service-extra-section` class.

Key patterns and conventions (concrete, discoverable):

- Dynamic content: update `pageData` in `styles/dashboard.js` to add banners/items. Example structure: `pageData.home.banners` is an array of objects with `title`, `desc`, `image`, and inline image fields. When adding banners keep the same keys.

- DOM hooks: `dashboard.js` looks for specific IDs and classes. Important IDs: `#page`, `#carousel`, `#carouselPrev`, `#carouselNext`, `#sidebar`, `#overlay`, `#hamburger`, `#notifBtn`, `#profileBtn`. When changing behavior, keep these selectors in sync or update their references in `dashboard.js`.

- Relative asset paths: JS uses relative paths like `../Images/...` (careful when moving files or editing pages in `pages/` — preserve relative linking semantics).

- Animations & scroll: There is an `_onScroll.scss` source and an `onScroll.css` used at runtime. The runtime code expects a compiled CSS (link id `scroll-anim-styles-link`) but will inject fallback styles if missing. If you edit the SCSS, recompile it to `onScroll.css` to preserve local development behavior.

- Third-party runtime checks: `dashboard.js` dynamically loads libraries if missing. Example: it checks `window.Chart` before loading Chart.js and checks `window.feather` for icons. Prefer using existing runtime checks when modifying those paths.

- File layout peculiarity: JS files live in `styles/` (e.g., `styles/dashboard.js`), not a `scripts/` folder. Agents altering build or lint tooling should respect existing layout or update references in HTML.

Developer workflows (what works here):

- No build system detected: this is a static site. To preview locally, open `index.html` in a browser or run a simple static server from the repo root. Example quick dev servers (not required by project):

  - `python -m http.server 8000` (from repo root)
  - `npx http-server . -p 8080`

- CSS/SCSS: If you edit `_onScroll.scss`, compile it to `styles/onScroll.css` (the project ships `onScroll.css`). If you change fonts, note `@font-face` in `styles/service.css` references `../webfonts/`.

Integration points and runtime dependencies (what to check before edits):

- Icon systems: Iconify attributes and `feather.replace()` are used. Keep icon attribute usage consistent.
- Charting: Chart.js is optionally loaded at runtime; check `dashboard.js` for dynamic loader code when modifying charts.

Editing safety checklist for AI changes (concrete rules):

1. Preserve `pageData` keys when adding or removing content. Update both the data and any template markup inside `dashboard.js`.
2. When renaming IDs/classes update all references in `index.html`, `pages/*` and `styles/dashboard.js` (search for `#page`, `#carousel`, etc.).
3. Keep image path semantics: assets are referenced relative to the JS/HTML file locations (usually `../Images/`).
4. When changing scroll animation styles, compile `_onScroll.scss` and ensure a `<link id="scroll-anim-styles-link">` remains present or that `dashboard.js` fallback works.

Quick grep/search hints for agents:

- Search for `pageData` to find where pages are defined (`styles/dashboard.js`).
- Search for `service-hero`, `service-extra-section` and `.service-footer` to locate service page templates and CSS (`styles/service.css`).
- Search for `#carousel`, `carouselPrev`, `carouselNext` for carousel behavior.

If anything here is unclear or you want examples expanded (e.g., exact banner JSON or the SCSS compilation command you use), tell me which area to expand and I will iterate.

Files that exemplify these patterns: `index.html`, `styles/dashboard.js`, `styles/service.css`, `styles/onScroll.css`, any files under `pages/`.

End of instructions.
