import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { normalizePath, routeKey } from './routes'
import { HYDRATABLE_MEDIA } from './hooks/useMediaQuery'
import { captureReferralCode } from './utils/referralCode'
import { initMetaPixel } from './utils/metaPixel'

captureReferralCode()
// Loads the Meta Pixel only if a Pixel ID is configured and the visitor has
// accepted cookies (now, or later via the cookie banner).
initMetaPixel()

// A reload should always start at the top (the hero), never at wherever the
// browser last left the page. A deep link with a #section hash is left alone.
// Old or shared links ending in #top: drop the hash (keeping any ?ref=) so the
// address stays clean; the page then starts at the top like any other load.
if (window.location.hash === '#top') {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (!window.location.hash) window.scrollTo(0, 0)

const path = normalizePath(window.location.pathname)
const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

// Each page's HTML is prerendered at build time (scripts/prerender.mjs), and
// hydrating it reuses that markup instead of building the page again. It's
// rendered as a phone with motion on, so that's where it's hydrated; other
// screens (see HYDRATABLE_MEDIA), and any HTML that wasn't rendered for this
// page, render from scratch instead, exactly as the site did before
// prerendering.
const canHydrate = container.dataset.route === routeKey(path) && window.matchMedia(HYDRATABLE_MEDIA).matches

if (canHydrate) {
  hydrateRoot(container, app)
} else {
  // The prerendered markup is display:none on these screens (a style
  // scripts/prerender.mjs adds, keyed to data-route), so it never cost any
  // layout; clear it and start from an empty #root, as before prerendering.
  container.replaceChildren()
  delete container.dataset.route
  createRoot(container).render(app)
}
