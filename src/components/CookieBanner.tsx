import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LINKS } from '../data/links';
import { useHydrated } from '../hooks/useHydrated';
import { getConsent, onOpenCookieSettings, setConsent, type ConsentChoice } from '../utils/consent';
import { META_PIXEL_ENABLED } from '../utils/metaPixel';

// Compact consent bar pinned to the bottom of the screen. It shows until the
// visitor chooses, and again whenever the footer's "Cookie settings" link is
// used. Accept and Reject are deliberately identical in size and style.
//
// While it is up, its height is published as --cookie-banner-h: the body gets
// that much bottom padding (so the end of the page can still be scrolled clear
// of the bar rather than hidden under it) and the WhatsApp button lifts by the
// same amount.
//
// The visitor's choice is in localStorage, which the prerendered HTML can't
// know about, so the bar is never part of it: it renders from the first
// render after hydration.
export function CookieBanner() {
  const hydrated = useHydrated();
  return META_PIXEL_ENABLED && hydrated ? <ConsentBar /> : null;
}

function ConsentBar() {
  const [choice, setChoice] = useState<ConsentChoice | null>(getConsent);
  const [open, setOpen] = useState(() => getConsent() === null);
  const ref = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      onOpenCookieSettings(() => {
        setChoice(getConsent());
        setOpen(true);
        // Keyboard users who opened it from the footer land on the choice.
        requestAnimationFrame(() => firstButtonRef.current?.focus());
      }),
    []
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!open || !el) {
      root.style.removeProperty('--cookie-banner-h');
      document.body.style.paddingBottom = '';
      return;
    }
    const apply = () => {
      const h = `${Math.ceil(el.getBoundingClientRect().height)}px`;
      root.style.setProperty('--cookie-banner-h', h);
      document.body.style.paddingBottom = h;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--cookie-banner-h');
      document.body.style.paddingBottom = '';
    };
  }, [open]);

  if (!open) return null;

  const choose = (next: ConsentChoice) => {
    setConsent(next);
    setChoice(next);
    setOpen(false);
  };

  const buttonClass =
    'min-w-[104px] flex-1 rounded-full border border-[rgba(243,240,234,.28)] px-5 py-2.5 text-[13.5px] font-medium text-ivory transition-colors duration-300 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none';

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[160] border-t border-[rgba(255,255,255,.08)] px-[clamp(20px,4vw,48px)] py-3.5"
      style={{
        background: 'rgba(10,10,12,.94)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        backdropFilter: 'blur(18px) saturate(140%)',
      }}
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p className="m-0 text-[13px] leading-[1.5] text-[rgba(243,240,234,.68)]">
          We use cookies to measure how our ads perform. You can change your choice any time under Cookie settings.{' '}
          <a
            href={LINKS.LEGAL.privacy}
            className="whitespace-nowrap text-accent underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            Privacy policy
          </a>
          {choice && <span className="text-grey-2"> · Current choice: {choice === 'accepted' ? 'Accepted' : 'Rejected'}</span>}
        </p>
        <div className="flex shrink-0 gap-3">
          <button ref={firstButtonRef} type="button" onClick={() => choose('rejected')} className={buttonClass}>
            Reject
          </button>
          <button type="button" onClick={() => choose('accepted')} className={buttonClass}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
