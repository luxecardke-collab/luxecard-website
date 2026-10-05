import { getLenis } from './lenisInstance';

// A little clearance below the nav, not scroll-margin-top: Lenis reads an
// element's own scroll-margin-top AND adds any explicit `offset` passed to
// scrollTo, so using both here would double the gap. Passing scrollTo a
// plain number (the exact scrollY we want) instead of the element sidesteps
// that lookup entirely — this is the only offset applied for this path.
const BREATHING_ROOM_PX = 8;

// Polls an element's rect.top across animation frames until it stops moving
// (a few consecutive frames within half a pixel of each other), then calls
// back with that settled value — instead of reading it once, mid-transition.
// Bounded so a target that never fully settles (or has no transition at all)
// still resolves quickly.
function waitForSettledTop(el: HTMLElement, onSettled: (top: number) => void) {
  const MAX_FRAMES = 90; // ~1.5s at 60fps — generous vs. the ~0.9s reveal transition
  const STABLE_FRAMES_NEEDED = 4;
  let lastTop: number | null = null;
  let stableCount = 0;
  let frame = 0;

  const step = () => {
    const top = el.getBoundingClientRect().top;
    if (lastTop !== null && Math.abs(top - lastTop) < 0.5) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    lastTop = top;
    frame++;
    if (stableCount >= STABLE_FRAMES_NEEDED || frame >= MAX_FRAMES) {
      onSettled(top);
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Glides (through Lenis, when it's running) so `target` lands just below the
 * nav bar, using the nav's own current rendered height — measured fresh, not
 * the CSS scroll-margin-top the desktop links still rely on — so it never
 * double-counts. Without Lenis (reduced motion) it jumps straight there.
 */
export function scrollToSection(target: HTMLElement) {
  const runScroll = (onDone?: () => void) => {
    const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 0;
    const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
    const finalScrollY = Math.max(0, absoluteTop - navHeight - BREATHING_ROOM_PX);
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(finalScrollY, { offset: 0, duration: 1.4, onComplete: onDone });
    } else {
      window.scrollTo({ top: finalScrollY, behavior: 'instant' });
      onDone?.();
    }
  };

  runScroll(() => {
    // One correction, only if it's actually off by more than a couple of px,
    // and only ever once: for a viewport height change mid-scroll (a real
    // phone's address bar collapsing/expanding), or a section above the
    // target finishing loading and changing height. First wait for the
    // target to actually stop moving: several sections (business, how, faqs)
    // run their own scroll-triggered reveal transition (translateY, ~0.9s)
    // that's still settling right as this scroll lands, and reading
    // getBoundingClientRect() mid-transition would base the one correction
    // on a moving target instead of its resting position.
    waitForSettledTop(target, (targetTopNow) => {
      const navBottomNow = document.querySelector('nav')?.getBoundingClientRect().bottom ?? 0;
      const diff = targetTopNow - navBottomNow - BREATHING_ROOM_PX;
      if (Math.abs(diff) <= 2) return;
      const correctionTarget = window.scrollY + diff;
      const lenis = getLenis();
      const tiny = Math.abs(diff) <= 20;
      if (lenis) {
        lenis.scrollTo(correctionTarget, { offset: 0, duration: tiny ? 0 : 0.3, immediate: tiny });
      } else {
        window.scrollTo({ top: correctionTarget, behavior: 'instant' });
      }
    });
  });
}

/**
 * Calls back with the element with this id as soon as it's in the document —
 * straight away if it already is, otherwise once it's added (e.g. a lazily
 * loaded section) — or not at all if that takes longer than `timeoutMs`.
 * Returns a cancel function.
 */
export function whenElementExists(id: string, onFound: (el: HTMLElement) => void, timeoutMs = 10000) {
  const existing = document.getElementById(id);
  if (existing) {
    onFound(existing);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const el = document.getElementById(id);
    if (!el) return;
    stop();
    onFound(el);
  });
  const timeout = window.setTimeout(() => stop(), timeoutMs);
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  observer.observe(document.body, { childList: true, subtree: true });
  return stop;
}
