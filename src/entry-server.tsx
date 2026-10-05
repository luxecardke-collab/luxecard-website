// Server-side entry, built by `vite build --ssr` and run once at build time
// by scripts/prerender.mjs (never shipped to the browser, so never
// hot-reloaded either).
/* eslint-disable react-refresh/only-export-components */
export { PAGES, renderHeadTags } from './seo/pages';
