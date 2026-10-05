// Runs after `vite build` and `vite build --ssr src/entry-server.tsx`.
// Writes one HTML file per page into dist/ (see src/seo/pages.ts), each with
// its own <head> tags in place of index.html's <!--app-head--> placeholder.
// vercel.json's cleanUrls serves dist/affiliate.html at /affiliate, etc.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { PAGES, renderHeadTags } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-head-->')) {
  throw new Error('dist/index.html has no <!--app-head--> placeholder; was it already prerendered?');
}

for (const page of PAGES) {
  const html = template.replace('<!--app-head-->', renderHeadTags(page));
  await fs.writeFile(path.join(dist, page.file), html);
  console.log(`prerendered ${page.path} -> dist/${page.file}`);
}
