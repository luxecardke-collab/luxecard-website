import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { setLenis } from '../utils/lenisInstance';
import { scrollToSection, whenElementExists } from '../utils/scrollToSection';

/**
 * Drives momentum/inertia scrolling for the whole page and intercepts
 * in-page anchor clicks (nav, hero CTA) so they glide with the same
 * easing instead of the browser's linear scroll-behavior: smooth.
 * Renders nothing. Under prefers-reduced-motion Lenis is off, but links to
 * the top of the page are still handled (an instant jump) so they never put
 * #top in the address bar.
 */
const TOP_HREF = '#top';

// Scrolls to the top of the page and leaves the address bar alone.
function isTopLink(anchor: Element | null | undefined) {
  return anchor?.getAttribute('href') === TOP_HREF;
}

// Lands an incoming section hash (e.g. "/#faqs", from a nav link clicked on
// another page) just below the nav bar, through the shared Lenis instance
// when it's running so it isn't fought over scroll ownership by a plain
// window.scrollTo. The section may not exist yet — several are lazily
// loaded — so this waits for it to appear, giving up if the visitor starts
// scrolling on their own first. Returns a cleanup function.
function landIncomingHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id || id === 'top') return () => {};
  let rafId: number | undefined;
  let cancelWait = () => {};
  const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'] as const;
  const stopListening = () => USER_SCROLL_EVENTS.forEach((e) => window.removeEventListener(e, onUserScroll));
  function onUserScroll() {
    cancelWait();
    stopListening();
  }
  USER_SCROLL_EVENTS.forEach((e) => window.addEventListener(e, onUserScroll, { passive: true }));
  // May call back straight away, if the section is already on the page.
  cancelWait = whenElementExists(id, (target) => {
    stopListening();
    rafId = requestAnimationFrame(() => scrollToSection(target));
  });
  return () => {
    cancelWait();
    stopListening();
    if (rafId !== undefined) cancelAnimationFrame(rafId);
  };
}

export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      const onTopClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement).closest?.('a[href^="#"]');
        if (!isTopLink(anchor)) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'instant' });
      };
      document.addEventListener('click', onTopClick);
      const cancelHash = landIncomingHash();
      return () => {
        document.removeEventListener('click', onTopClick);
        cancelHash();
      };
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.15,
    });

    setLenis(lenis);

    let rafId = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });

    const cancelHash = landIncomingHash();

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.length < 2) return;
      if (isTopLink(anchor)) {
        e.preventDefault();
        lenis.scrollTo(0, { duration: 1.4 });
        return;
      }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 0;
      lenis.scrollTo(target as HTMLElement, { offset: -navHeight, duration: 1.4 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(rafId);
      cancelHash();
      setLenis(null);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
