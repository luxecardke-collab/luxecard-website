import { lazy, startTransition, Suspense, useEffect, type ReactNode } from 'react';
import { CartProvider } from './components/CartProvider';
import { ContactModalProvider } from './components/ContactModalProvider';
import { CookieBanner } from './components/CookieBanner';
import { useCart } from './context/cartContext';
import { useContactModal } from './context/contactModalContext';
import { useInquiryModal } from './context/inquiryModalContext';
import { useNavMenu } from './context/navMenuContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import { Ecosystem } from './components/Ecosystem';
import { FinalCta } from './components/FinalCta';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { LegalPage } from './components/LegalPage';
import { PagePathContext } from './context/pagePathContext';
import { routeFor } from './routes';
import { InquiryModalProvider } from './components/InquiryModalProvider';
import { Nav } from './components/Nav';
import { NavMenuProvider } from './components/NavMenuProvider';
import { NetworkingMoment } from './components/NetworkingMoment';
import { NotFound } from './components/NotFound';
import { Problem } from './components/Problem';
import { Professionals } from './components/Professionals';
import { SmoothScroll } from './components/SmoothScroll';
import { Testimonials } from './components/Testimonials';
import { WhatsAppButton } from './components/WhatsAppButton';

// Each of these is a full page reached by its own URL, never the homepage
// — /affiliate, /order-confirmation — so neither needs to be in the bundle
// that renders the homepage's first paint.
const AffiliateProgram = lazy(() => import('./components/AffiliateProgram').then((m) => ({ default: m.AffiliateProgram })));
// The card landing pages (/wood, …), reached from ads and the nav.
const CardLandingPage = lazy(() => import('./components/CardLandingPage').then((m) => ({ default: m.CardLandingPage })));
const OrderConfirmation = lazy(() =>
  import('./components/OrderConfirmation').then((m) => ({ default: m.OrderConfirmation })),
);
// The cart drawer is lazy too (see CartProvider's shouldLoadDrawer); gated
// the same way as the two modals in InquiryModalProvider/ContactModalProvider.
const CartDrawer = lazy(() => import('./components/CartDrawer').then((m) => ({ default: m.CartDrawer })));

// Fetches the cart drawer's and both modals' chunks once the page has had a
// moment to settle after its first paint, so opening any of them normally
// has nothing left to wait on — without delaying the homepage's own first
// paint by adding to its bundle. Renders nothing; needs to sit inside all
// three providers to reach their preload functions.
function IdlePreloadModals() {
  const { preloadDrawer } = useCart();
  const { preload: preloadInquiry } = useInquiryModal();
  const { preload: preloadContact } = useContactModal();

  useEffect(() => {
    // Each preload flips a flag in its provider's context. As a transition,
    // that update waits for any prerendered section still hydrating (its
    // lazy chunk not loaded yet) rather than making React throw that
    // section's server HTML away and render it again from scratch.
    const run = () =>
      startTransition(() => {
        preloadDrawer();
        preloadInquiry();
        preloadContact();
      });
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 1);
    return () => clearTimeout(id);
  }, [preloadDrawer, preloadInquiry, preloadContact]);

  return null;
}

// Only rendered once the cart drawer has actually been requested — opened,
// or preloaded — so its lazy chunk isn't fetched before then either.
function LazyCartDrawer() {
  const { shouldLoadDrawer } = useCart();
  if (!shouldLoadDrawer) return null;
  return (
    <Suspense fallback={null}>
      <CartDrawer />
    </Suspense>
  );
}

// Below-the-fold sections that don't affect the hero's first paint and
// don't drive any scroll-position math (unlike HowItWorks/Ecosystem/
// NetworkingMoment, which use useScrollSpread/useScrollGlow/
// useHowItWorksStage and stay static imports for that reason).
const Faq = lazy(() => import('./components/Faq').then((m) => ({ default: m.Faq })));
const ForBusiness = lazy(() => import('./components/ForBusiness').then((m) => ({ default: m.ForBusiness })));
const ContactVisit = lazy(() => import('./components/ContactVisit').then((m) => ({ default: m.ContactVisit })));
const Footer = lazy(() => import('./components/Footer').then((m) => ({ default: m.Footer })));

const loadBelowFold = () =>
  Promise.all([import('./components/Faq'), import('./components/ForBusiness'), import('./components/ContactVisit'), import('./components/Footer')]);

// Fetches all four below-the-fold chunks once the page has had a moment to
// settle after the hero's first paint, so a normal scroll down the page
// never actually sees a placeholder — same idle/timeout-fallback pattern as
// IdlePreloadModals above.
function IdlePreloadBelowFold() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(loadBelowFold, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(loadBelowFold, 1);
    return () => clearTimeout(id);
  }, []);
  return null;
}

// A same-height placeholder while a section's chunk loads: same background
// as the page, so there's nothing to flash, and a min-height measured from
// the real section at each breakpoint (same md: breakpoint these sections'
// own responsive classes use) so nothing shifts under it — or under an
// in-page anchor link landing past it — while it's still loading.
function SectionPlaceholder({ mobilePx, desktopPx }: { mobilePx: number; desktopPx: number }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  return <div aria-hidden="true" style={{ background: 'var(--bg-base)', minHeight: isDesktop ? desktopPx : mobilePx }} />;
}

// Nav dims itself directly for the cart, but deliberately stays at full
// opacity for its own mobile menu, since the menu panel is rendered inside
// it. WhatsAppButton dims for both. Everything else — ordinary flow content
// — gets a fixed overlay laid over it here: a frosted dark glass pane, the
// same look the original `filter: blur()` on the content itself had, but far
// cheaper. The blur radius is a constant, never itself transitioned — only
// this pane's opacity animates, so opening/closing never asks the browser to
// recompute the blur at a series of intermediate radii, only to fade a
// backdrop that's already blurred at a fixed strength.
function BlurredContent({ children }: { children: ReactNode }) {
  const { isOpen: cartOpen } = useCart();
  const { isOpen: menuOpen } = useNavMenu();
  const dimmed = cartOpen || menuOpen;
  return (
    <>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[85]"
        style={{
          background: 'rgba(4,4,6,.4)',
          WebkitBackdropFilter: 'blur(18px)',
          backdropFilter: 'blur(18px)',
          opacity: dimmed ? 1 : 0,
          visibility: dimmed ? 'visible' : 'hidden',
          transition: `opacity 550ms cubic-bezier(.65,0,.35,1), visibility 0s linear ${dimmed ? '0s' : '550ms'}`,
        }}
      />
    </>
  );
}

// `path` is the page's normalized path (see routes.ts): passed in by
// main.tsx in the browser, and by entry-server.tsx when prerendering.
function App({ path }: { path: string }) {
  return (
    <PagePathContext.Provider value={path}>
      <Page path={path} />
    </PagePathContext.Provider>
  );
}

function Page({ path }: { path: string }) {
  const route = routeFor(path);

  if (route.kind === 'order-confirmation') {
    return (
      <>
        <Suspense fallback={null}>
          <OrderConfirmation />
        </Suspense>
        <CookieBanner />
      </>
    );
  }

  return (
    <div style={{ overflowX: 'clip', background: 'var(--bg-base)' }}>
      <NavMenuProvider>
        <CartProvider>
          <InquiryModalProvider>
            <ContactModalProvider>
              <SmoothScroll />
              <IdlePreloadModals />
              <IdlePreloadBelowFold />
              <Nav />
              <BlurredContent>
                {route.kind === 'legal' ? (
                  <LegalPage doc={route.doc} />
                ) : route.kind === 'not-found' ? (
                  <NotFound />
                ) : route.kind === 'card' ? (
                  <Suspense fallback={null}>
                    <CardLandingPage card={route.page} />
                  </Suspense>
                ) : route.kind === 'affiliate' ? (
                  <Suspense fallback={null}>
                    <AffiliateProgram />
                  </Suspense>
                ) : (
                  <main className="pt-[var(--nav-h)]">
                    <Hero />
                    <Testimonials />
                    <Ecosystem />
                    <HowItWorks />
                    {/* On phones "Trusted Across Industries" comes before
                        "Digitizing Networking Across Africa"; on larger
                        screens the order is the other way round. Done in CSS
                        (same md breakpoint as the portfolio's own mobile
                        layout) so the prerendered HTML is already in the
                        right order on every screen. */}
                    <div className="flex flex-col">
                      <div className="max-md:order-1">
                        <Problem />
                      </div>
                      <Professionals />
                    </div>
                    <NetworkingMoment />
                    <Suspense fallback={<SectionPlaceholder mobilePx={1054} desktopPx={615} />}>
                      <ForBusiness />
                    </Suspense>
                    <Suspense fallback={<SectionPlaceholder mobilePx={1661} desktopPx={1699} />}>
                      <Faq />
                    </Suspense>
                    <FinalCta />
                    <Suspense fallback={<SectionPlaceholder mobilePx={687} desktopPx={657} />}>
                      <ContactVisit />
                    </Suspense>
                  </main>
                )}
                <Suspense fallback={<SectionPlaceholder mobilePx={671} desktopPx={407} />}>
                  <Footer />
                </Suspense>
              </BlurredContent>
              <WhatsAppButton />
              <CookieBanner />
              <LazyCartDrawer />
            </ContactModalProvider>
          </InquiryModalProvider>
        </CartProvider>
      </NavMenuProvider>
    </div>
  );
}

export default App;
