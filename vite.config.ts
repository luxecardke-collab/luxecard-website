import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { HOME_PAGE, renderHeadTags } from './src/seo/pages'

// https://vite.dev/config/
//
// public/ is Vite's designated pass-through folder: everything in it is
// copied to dist/ byte-for-byte, untouched by any plugin or asset
// pipeline, which is exactly what public/og-image.png (the WhatsApp/social
// link preview image) needs — it must stay pixel-for-pixel 1200x630 to
// match the og:image:width/height tags in src/seo/pages.ts, or previews
// render blurry/stretched. If an image-optimization plugin is ever added
// to this config, either scope it away from public/ entirely, or add an
// explicit exclude for og-image.png.
export default defineConfig(({ isSsrBuild }) => ({
  // The SSR build (src/entry-server.tsx) only produces a module for
  // scripts/prerender.mjs to run; it needs no copy of public/.
  build: { copyPublicDir: !isSsrBuild },
  // When the site was built, to the hour, so the browser and SSR builds
  // (run one after the other) agree; see OFFER_SPACE_RESERVED in
  // src/components/CardLandingPage.tsx.
  define: { __BUILD_HOUR__: JSON.stringify(Math.floor(Date.now() / 3_600_000) * 3_600_000) },
  plugins: [
    react(),
    // The dev server has no prerender step (scripts/prerender.mjs fills in
    // each page's head at build time), so give every dev page the homepage's
    // tags rather than none.
    {
      name: 'dev-page-head',
      apply: 'serve',
      transformIndexHtml: (html) => html.replace('<!--app-head-->', renderHeadTags(HOME_PAGE)),
    },
  ],
}))
