// Runs after `vite build` and `vite build --ssr src/entry-server.tsx`.
// Writes one HTML file per page into dist/ (see src/seo/pages.ts), each with
// its own <head> tags (and, for the homepage, JSON-LD structured data) in
// place of index.html's <!--app-head--> placeholder and, for every page
// except browser-only ones, the page itself already rendered into #root for
// main.tsx to hydrate. vercel.json's cleanUrls
// serves dist/affiliate.html at /affiliate, etc.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { PAGES, renderHeadTags, renderJsonLd, renderPage, routeKey, HYDRATABLE_MEDIA } = await import(
  pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href
);

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const ROOT = '<div id="root"></div>';
if (!template.includes('<!--app-head-->') || !template.includes(ROOT)) {
  throw new Error('dist/index.html is missing <!--app-head--> or an empty #root; was it already prerendered?');
}

// React puts resource hints it finds while rendering (e.g. a preload for the
// nav logo, from its fetchPriority="high") at the very start of the markup.
// index.html's <head> already preloads everything the pages need this way,
// so these are dropped rather than left inside #root; anything new would
// fail the build so it gets a proper home in index.html.
function withoutHoistedLinks(html) {
  return html.replace(/^(?:<link [^>]*\/>)+/, (links) => {
    for (const href of links.matchAll(/href="([^"]+)"/g)) {
      if (!template.includes(`href="${href[1]}"`)) {
        throw new Error(`Rendered markup hoists a <link> to ${href[1]} that index.html doesn't have`);
      }
    }
    return '';
  });
}

// main.tsx only hydrates the prerendered markup on screens it was rendered
// for (HYDRATABLE_MEDIA: phones, motion on); everywhere else it renders from
// scratch. There the markup is hidden from the start, so the browser doesn't
// lay out and paint a whole page that's about to be replaced — those screens
// load exactly as they did before prerendering. Crawlers still read it all.
const HIDE_UNHYDRATED = `<style>@media not all and ${HYDRATABLE_MEDIA} { #root[data-route] > * { display: none } }</style>`;

for (const page of PAGES) {
  // data-route tells main.tsx which page this markup was rendered for, so it
  // only hydrates markup that matches the page it's on.
  const body =
    page.prerender === false
      ? ROOT
      : `<div id="root" data-route="${routeKey(page.path)}">${withoutHoistedLinks(await renderPage(page.path))}</div>`;
  const head = [renderHeadTags(page), page.prerender === false ? '' : HIDE_UNHYDRATED, renderJsonLd(page.path)]
    .filter(Boolean)
    .join('\n    ');
  const html = template.replace('<!--app-head-->', head).replace(ROOT, body);
  await fs.writeFile(path.join(dist, page.file), html);
  console.log(`prerendered ${page.path} -> dist/${page.file}`);
}
