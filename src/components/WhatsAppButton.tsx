import { useEffect, useState } from 'react';
import { useCart } from '../context/cartContext';
import { useNavMenu } from '../context/navMenuContext';
import { usePagePath } from '../context/pagePathContext';
import { cardPageFor } from '../data/cardPages';
import { cardPageWhatsAppSource, WHATSAPP_SOURCES, whatsappLinkProps } from '../utils/whatsapp';
import { useReducedMotion } from '../hooks/useReducedMotion';

const TRANSITION_MS = 250;

// Elements the button keeps clear of, marked with data-whatsapp-landmark:
// the page's FAQ section (home, /affiliate), the footer, and the footer's
// "Designed & built by" credit.
type Landmarks = { faq: Element | null; footer: Element | null; credit: Element | null };

function findLandmarks(): Landmarks {
  const find = (name: string) => document.querySelector(`[data-whatsapp-landmark="${name}"]`);
  return { faq: find('faq'), footer: find('footer'), credit: find('footer-credit') };
}

// The credit counts as close once it's within this much of the bottom of
// the screen, so at a normal scrolling speed the button has finished fading
// out before the credit scrolls up to where it sits.
const CREDIT_NEAR_MARGIN = '0px 0px 120px 0px';

const sameLandmarks = (a: Landmarks, b: Landmarks) => a.faq === b.faq && a.footer === b.footer && a.credit === b.credit;

/**
 * Floating WhatsApp shortcut. On pages with an FAQ it hides once the visitor
 * has scrolled past the FAQ (the contact section and footer below cover the
 * same ground) and shows again when the FAQ comes back into view; on other
 * pages it hides while the footer is in view. Either way it's hidden while
 * the footer's credit is on screen, so it can never sit on top of it.
 * Hidden, it's out of the tab order and can't be clicked.
 *
 * It hides as the credit gets close (CREDIT_NEAR_MARGIN), and if the credit
 * is ever actually on screen while the button is still showing or mid-fade
 * (a fast fling, or a jump straight to the bottom), it disappears at once
 * instead of fading.
 */
export function WhatsAppButton() {
  const [{ hidden, instant }, setState] = useState({ hidden: false, instant: false });
  const { isOpen: cartOpen } = useCart();
  const { isOpen: menuOpen } = useNavMenu();
  const reducedMotion = useReducedMotion();
  const pagePath = usePagePath();
  const cardPage = cardPageFor(pagePath);

  useEffect(() => {
    let landmarks = findLandmarks();
    let pastFaq = false;
    let footerInView = false;
    let creditInView = false;
    let creditNear = false;

    const update = () => {
      const next = landmarks.faq ? pastFaq || creditNear || creditInView : footerInView;
      setState((prev) => {
        // Snap instead of fading whenever the credit is actually on screen.
        const instant = next && (prev.instant || creditInView);
        return prev.hidden === next && prev.instant === instant ? prev : { hidden: next, instant };
      });
    };

    // An observer only reports an element entering or leaving its area, so
    // "scrolled past the FAQ" is watched as the FAQ being entirely inside an
    // area covering everything above the screen. Watching the FAQ against
    // the screen itself would miss a jump straight over it (End key, a
    // fling), where it's never on screen at all.
    const pastIo = new IntersectionObserver(
      ([entry]) => {
        pastFaq = entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.bottom ?? 0) + 0.5;
        update();
      },
      { rootMargin: '1000000px 0px -100% 0px', threshold: [0, 1] }
    );
    const viewIo = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === landmarks.footer) footerInView = entry.isIntersecting;
        if (entry.target === landmarks.credit) creditInView = entry.isIntersecting;
      }
      update();
    });
    const nearIo = new IntersectionObserver(
      ([entry]) => {
        creditNear = entry.isIntersecting;
        update();
      },
      { rootMargin: CREDIT_NEAR_MARGIN }
    );
    const observers = [pastIo, viewIo, nearIo];
    const observeAll = () => {
      const { faq, footer, credit } = landmarks;
      if (faq) pastIo.observe(faq);
      if (footer) viewIo.observe(footer);
      if (credit) {
        viewIo.observe(credit);
        nearIo.observe(credit);
      }
    };
    observeAll();

    // Several sections (the FAQ, the footer) are lazily loaded and mount
    // after this button, so look for the landmarks again whenever the page's
    // structure changes, at most once a frame.
    let rafId = 0;
    const mo = new MutationObserver(() => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const next = findLandmarks();
        if (sameLandmarks(next, landmarks)) return;
        observers.forEach((o) => o.disconnect());
        pastFaq = footerInView = creditInView = creditNear = false;
        landmarks = next;
        observeAll();
        update();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observers.forEach((o) => o.disconnect());
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <a
      {...whatsappLinkProps(
        cardPage
          ? cardPageWhatsAppSource(cardPage, 'floating-button')
          : pagePath === '/affiliate'
            ? WHATSAPP_SOURCES.floatingAffiliate
            : WHATSAPP_SOURCES.floating
      )}
      aria-label="Chat with us on WhatsApp"
      aria-hidden={hidden}
      // inert takes it out of the tab order and pointer hit-testing while hidden.
      inert={hidden}
      tabIndex={hidden ? -1 : undefined}
      // Kept above the cookie banner and a card page's order bar (phones).
      className="fixed bottom-[calc(clamp(16px,4vw,28px)+var(--cookie-banner-h,0px)+var(--order-bar-h,0px))] right-[clamp(16px,4vw,28px)] z-[150] flex h-14 w-14 items-center justify-center rounded-full hover:-translate-y-0.5"
      style={{
        background: '#25D366',
        boxShadow: '0 14px 32px -10px rgba(0,0,0,.55)',
        // Dimmed instead of blurred while the cart/menu is open — cheaper,
        // and it's a small floating icon, not something worth reblurring.
        opacity: hidden ? 0 : cartOpen || menuOpen ? 0.35 : 1,
        // Reduced motion: fade only, no slide.
        transform: hidden && !reducedMotion ? 'translateY(12px)' : 'none',
        pointerEvents: hidden ? 'none' : 'auto',
        // visibility flips after the fade finishes when hiding, immediately when showing.
        visibility: hidden ? 'hidden' : 'visible',
        transition: instant
          ? 'none'
          : `opacity ${TRANSITION_MS}ms ease-out, transform ${TRANSITION_MS}ms ease-out, visibility 0s linear ${hidden ? `${TRANSITION_MS}ms` : '0s'}`,
      }}
    >
      <svg viewBox="0 0 448 512" width="28" height="28" fill="#ffffff" aria-hidden="true">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.9l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
      </svg>
    </a>
  );
}
