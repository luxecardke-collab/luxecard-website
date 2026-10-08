import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { onScrollToTop } from './scrollTopReset';

/**
 * Per-section scroll reveal: rise + fade + slight scale-in, triggered once
 * the element's top passes ~88% of viewport height. Each section owns its
 * own observer (rather than a shared imperative one) so a parent
 * re-render can never strand a section at opacity: 0.
 *
 * Scrolling all the way back to the top re-arms every instance, so the next
 * scroll down plays the same entrance again, the same as a fresh load —
 * including a section that's already on screen when it re-arms.
 *
 * `firstPaint`: the same entrance starts in CSS (animate-reveal-rise) from
 * the page's first paint, without waiting for JavaScript, for a section
 * that can be on screen at load (the reviews, right under a short hero).
 * Once the page is running, a section that wasn't on screen at load
 * switches to the normal on-scroll reveal before it's seen, so it looks
 * and behaves exactly as without this option.
 */
export function useReveal<T extends HTMLElement>(delayMs = 0, { firstPaint = false }: { firstPaint?: boolean } = {}) {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced);
  // 'css' while the first-paint animation is in charge; 'js' otherwise.
  const [mode, setMode] = useState<'css' | 'js'>(firstPaint ? 'css' : 'js');

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let io: IntersectionObserver | null = null;
    let immediateRaf: number | null = null;

    const disarm = () => {
      if (immediateRaf !== null) {
        cancelAnimationFrame(immediateRaf);
        immediateRaf = null;
      }
      io?.disconnect();
      io = null;
    };

    const arm = () => {
      disarm();
      // Already in view right now: reveal shortly, rather than waiting on a
      // scroll event that may never come (a fresh load with the section
      // already on screen, or re-arming while it's still on screen after
      // scrolling back to the top).
      if (el.getBoundingClientRect().top <= window.innerHeight * 0.88) {
        immediateRaf = requestAnimationFrame(() => {
          immediateRaf = requestAnimationFrame(() => setVisible(true));
        });
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setVisible(true);
              disarm();
            }
          }
        },
        { threshold: 0, rootMargin: '0px 0px -12% 0px' }
      );
      io.observe(el);
    };

    if (firstPaint && el.getBoundingClientRect().top <= window.innerHeight * 0.88) {
      // On screen at load: the CSS entrance is already playing.
      setVisible(true);
    } else {
      setMode('js');
      arm();
    }
    const unsubscribe = onScrollToTop(() => {
      setMode('js');
      setVisible(false);
      arm();
    });

    return () => {
      disarm();
      unsubscribe();
    };
  }, [reduced, firstPaint]);

  const style: CSSProperties =
    reduced || mode === 'css'
      ? {}
      : {
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(34px) scale(.98)',
          transition: 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)',
          transitionDelay: `${delayMs}ms`,
          willChange: 'opacity, transform',
        };
  const className = !reduced && mode === 'css' ? 'animate-reveal-rise' : '';

  return { ref, style, className, visible };
}
