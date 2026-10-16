// Runs after scripts/prerender.mjs (part of `npm run build`). Writes
// dist/sitemap.xml for every indexable page (every page in src/seo/pages.ts
// without noindex, so /details, /order-confirmation, /404 and the offer
// versions of the card pages stay out), with each page's real last-updated
// date.
//
// The date: each page's content (its text, title, description, structured
// data and images, from its built HTML) is fingerprinted, and the live
// site's sitemap-dates.json says what each page's fingerprint and date were
// at the last deploy. A page whose fingerprint is unchanged keeps its date;
// one that changed (or is new, or the live list can't be read) gets today's.
// The new list is published as dist/sitemap-dates.json for the next build.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { PAGES } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);
const SITE_URL = 'https://www.luxecard.co.ke';
const DATES_FILE = 'sitemap-dates.json';

// Same order as before: the homepage, the card pages, then the rest.
const rank = (p) => (p.path === '/' ? 0 : p.file.match(/^(plastic|wood|metal|chairman)\.html$/) ? 1 : 2);
const pages = PAGES.filter((p) => !p.noindex).sort((a, b) => rank(a) - rank(b));

// What a page says and shows, without anything that changes on every build
// (asset hashes, the Search Console tag, scripts) or that isn't content.
function fingerprint(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
  const body = html.match(/<div id="root"[^>]*>([\s\S]*)<\/div>\s*(?:<script|<\/body>)/)?.[1] ?? '';
  const pick = (re) => [...head.matchAll(re)].map((m) => m[1]).join('\n');
  const content = [
    pick(/<title>([\s\S]*?)<\/title>/g),
    pick(/<meta name="description" content="([^"]*)"/g),
    pick(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    // Text, with tags as spaces.
    body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    // Images: which ones (without the build's hash in their file names) and their alt text.
    [...body.matchAll(/<img\b[^>]*>/g)]
      .map((m) => `${m[0].match(/src="([^"]*)"/)?.[1] ?? ''}|${m[0].match(/alt="([^"]*)"/)?.[1] ?? ''}`.replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)/g, '$1'))
      .join('\n'),
  ].join('\n---\n');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

async function previousDates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // SITEMAP_DATES_URL: for testing only (another list to compare with).
    const res = await fetch(process.env.SITEMAP_DATES_URL || `${SITE_URL}/${DATES_FILE}`, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    console.warn(`sitemap: no previous ${DATES_FILE} from the live site (${err.message}); changed pages get today's date.`);
    return {};
  } finally {
    clearTimeout(timer);
  }
}

const today = new Date().toISOString().slice(0, 10);
const previous = await previousDates();
const dates = {};
for (const page of pages) {
  const hash = fingerprint(await fs.readFile(path.join(dist, page.file), 'utf8'));
  const before = previous[page.path];
  const date = before?.hash === hash && /^\d{4}-\d{2}-\d{2}$/.test(before.date ?? '') ? before.date : today;
  dates[page.path] = { hash, date };
  console.log(`sitemap: ${page.path} ${date}${date === today && before?.hash !== hash ? ' (changed)' : ''}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated at each build by scripts/sitemap.mjs. lastmod is the date a
     page's content last changed on the live site. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${dates[p.path].date}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
await fs.writeFile(path.join(dist, 'sitemap.xml'), xml);
await fs.writeFile(path.join(dist, DATES_FILE), `${JSON.stringify(dates, null, 2)}\n`);
console.log(`sitemap: ${pages.length} pages -> dist/sitemap.xml`);
