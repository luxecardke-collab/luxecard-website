// Server-side entry, built by `vite build --ssr` and run once at build time
// by scripts/prerender.mjs (never shipped to the browser, so never
// hot-reloaded either).
/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import App from './App';
import { HYDRATABLE_MEDIA } from './hooks/useMediaQuery';
import { routeKey } from './routes';

export { PAGES, renderHeadTags } from './seo/pages';
export { renderJsonLd } from './seo/structuredData';
export { HYDRATABLE_MEDIA, routeKey };

// The page's HTML, ready to be hydrated by main.tsx. prerender() waits for
// every React.lazy section to load; the huge progressiveChunkSize keeps each
// one inline where it belongs, instead of React moving large sections to
// hidden <div>s at the end that inline scripts swap into place.
export async function renderPage(path: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER }
  );
  return new Response(prelude).text();
}
