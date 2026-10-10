import { useCallback, useEffect, useRef, useState } from 'react';
import { Contact, FileText, MessageSquareText, MousePointerClick, QrCode, RefreshCw, UserPlus, UserRound, type LucideIcon } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';
import { useSampleProfile } from '../hooks/useSampleProfile';
import type { ProfilePart } from './SampleProfile';

// The profile's background (SampleProfile's), so the empty screen matches.
const PROFILE_BG = '#0C0C0E';

// "What they see when you tap": the sample profile (SampleProfile) on a phone,
// with what's on it around it. Desktop: four features either side of the
// phone, sliding in from their side; the one for the part on screen lights up
// as the phone scrolls itself, and clicking one scrolls the phone to it.
// Phones: the phone, then a two-column grid of compact tiles fading in.
// The profile scrolls itself slowly (not with reduced motion) and stops while
// the visitor scrolls it. Its contents are only built once the section is
// near the screen, so they never weigh on the first screen.

const FEATURES: { part: ProfilePart; icon: LucideIcon; title: string; body: string }[] = [
  { part: 'brand', icon: UserRound, title: 'Your brand, front and centre', body: 'Logo, photo, name, title and company.' },
  { part: 'story', icon: FileText, title: 'Your story', body: 'A tagline and a short bio about you or your business.' },
  { part: 'actions', icon: MousePointerClick, title: 'One-tap actions', body: 'Your website and WhatsApp, a tap away.' },
  { part: 'contact', icon: Contact, title: 'Contact details', body: 'Email and phone numbers, ready to tap.' },
  { part: 'qr', icon: QrCode, title: 'Your QR code', body: 'Anyone can scan it to open your profile, even without NFC.' },
  { part: 'inquiries', icon: MessageSquareText, title: 'Inquiries form', body: 'People can send you a message straight from your profile.' },
  { part: 'add', icon: UserPlus, title: 'Add to contact', body: 'Your details saved to their phone in one tap.' },
  { part: 'brand', icon: RefreshCw, title: 'Always up to date', body: 'Change your details any time, with no new card needed.' },
];

// Auto-scroll speed (px per second), pauses (ms) and how long after the
// visitor's last touch it starts again.
const SCROLL_SPEED = 28;
const PAUSE_MS = 2200;
const RESUME_AFTER_MS = 6000;
const STAGGER_MS = 110;

function PhoneMock({ profile, active, screenRef, onInteract, onScroll }: {
  profile: ReturnType<typeof useSampleProfile>;
  active: ProfilePart | null;
  screenRef: React.RefObject<HTMLDivElement | null>;
  onInteract: () => void;
  onScroll: () => void;
}) {
  return (
    <div
      className="w-[min(290px,74vw)] rounded-[44px] p-[10px] md:w-[300px]"
      style={{ background: 'linear-gradient(160deg, #2A2A30, #101012 55%, #1C1C21)', boxShadow: '0 60px 100px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.07)' }}
    >
      <div className="relative aspect-[9/19.2] overflow-hidden rounded-[35px]" style={{ background: PROFILE_BG }}>
        <div aria-hidden="true" className="absolute left-1/2 top-[9px] z-[3] h-[18px] w-[32%] -translate-x-1/2 rounded-full bg-black" />
        {/* The visitor can scroll it (Lenis leaves it alone). */}
        <div
          ref={screenRef}
          data-lenis-prevent
          aria-hidden="true"
          onWheel={onInteract}
          onTouchStart={onInteract}
          onPointerDown={onInteract}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {profile && <profile.SampleProfile active={active} />}
        </div>
        {profile && <profile.ProfileOverlays active={active} />}
      </div>
    </div>
  );
}

function FeatureItem({ f, on, onPick, style, compact = false }: {
  f: (typeof FEATURES)[number];
  on: boolean;
  onPick: () => void;
  style: React.CSSProperties;
  compact?: boolean;
}) {
  const Icon = f.icon;
  return (
    <button
      type="button"
      onClick={onPick}
      style={style}
      className={`flex w-full items-start gap-3 rounded-[14px] border text-left transition-[background-color,border-color] duration-300 ${compact ? 'flex-col p-3.5' : 'px-4 py-3.5'}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
        style={{ background: on ? '#FDD303' : 'rgba(253,211,3,.1)', color: on ? '#0B0B0D' : '#FDD303' }}
      >
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span>
        <span className={`block font-manrope font-medium tracking-[-.02em] text-ivory ${compact ? 'text-[14.5px]' : 'text-[16px]'}`}>{f.title}</span>
        <span className={`mt-0.5 block leading-[1.45] text-[rgba(243,240,234,.5)] ${compact ? 'text-[12.5px]' : 'text-[13.5px]'}`}>{f.body}</span>
      </span>
    </button>
  );
}

export function VCardShowcase() {
  const reduced = useReducedMotion();
  // One layout at a time, so the phone's ref is always the one on screen.
  const wide = useMediaQuery('(min-width: 1024px)');
  const { ref: headingRef, style: headingStyle } = useReveal<HTMLHeadingElement>();
  const sectionRef = useRef<HTMLElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // The sample profile's code, fetched as the section nears the screen.
  const profile = useSampleProfile(sectionRef);
  const [inView, setInView] = useState(false);
  const [listIn, setListIn] = useState(reduced);
  const [outline, setOutline] = useState<ProfilePart | null>(null);
  const [current, setCurrent] = useState(0);
  const lastTouch = useRef(0);
  // After a pick, the picked feature stays lit while the phone scrolls to it
  // (a part near the end can't reach the top of the screen).
  const pinnedUntil = useRef(0);
  const outlineTimer = useRef<number | undefined>(undefined);

  // Build the profile within a screen or so of the section; auto-scroll only
  // while it's on screen; bring the features in once they're in view.
  useEffect(() => {
    const el = sectionRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    const listIo = new IntersectionObserver(([e]) => e.isIntersecting && setListIn(true), { rootMargin: '0px 0px -12% 0px' });
    viewIo.observe(el);
    listIo.observe(list);
    return () => {
      viewIo.disconnect();
      listIo.disconnect();
    };
  }, []);

  const onInteract = useCallback(() => {
    lastTouch.current = performance.now();
  }, []);

  // The feature for the part at the top third of the phone's screen.
  const onScroll = useCallback(() => {
    const screen = screenRef.current;
    if (!screen || performance.now() < pinnedUntil.current) return;
    const line = screen.scrollTop + screen.clientHeight * 0.33;
    let part: ProfilePart = 'brand';
    screen.querySelectorAll<HTMLElement>('[data-part]').forEach((p) => {
      if (p.offsetTop <= line) part = p.dataset.part as ProfilePart;
    });
    setCurrent((prev) => (FEATURES[prev].part === part ? prev : FEATURES.findIndex((f) => f.part === part)));
  }, []);

  // Slowly down to the bottom, pause, back to the top, pause, again.
  useEffect(() => {
    if (reduced || !profile || !inView) return;
    const screen = screenRef.current;
    if (!screen) return;
    let raf = 0;
    let prev = performance.now();
    let phase: 'down' | 'pause-bottom' | 'pause-top' = 'pause-top';
    let phaseStart = prev;
    let pos = screen.scrollTop;
    const tick = (now: number) => {
      const dt = Math.min(now - prev, 64);
      prev = now;
      if (now - lastTouch.current < RESUME_AFTER_MS) {
        pos = screen.scrollTop;
        phase = 'pause-top';
        phaseStart = now;
      } else {
        const max = screen.scrollHeight - screen.clientHeight;
        if (phase === 'pause-top' && now - phaseStart > PAUSE_MS) phase = 'down';
        if (phase === 'down') {
          pos = Math.min(max, pos + (SCROLL_SPEED * dt) / 1000);
          screen.scrollTop = pos;
          if (pos >= max - 0.5) [phase, phaseStart] = ['pause-bottom', now];
        } else if (phase === 'pause-bottom' && now - phaseStart > PAUSE_MS) {
          screen.scrollTo({ top: 0, behavior: 'smooth' });
          pos = 0;
          [phase, phaseStart] = ['pause-top', now + 1200];
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, profile, inView]);

  const pick = (i: number) => {
    const { part } = FEATURES[i];
    const screen = screenRef.current;
    lastTouch.current = performance.now();
    pinnedUntil.current = performance.now() + RESUME_AFTER_MS;
    setCurrent(i);
    setOutline(part);
    window.clearTimeout(outlineTimer.current);
    outlineTimer.current = window.setTimeout(() => setOutline(null), 2600);
    if (!screen || part === 'add') return; // "Add to contact" is pinned on screen
    const target = screen.querySelector<HTMLElement>(`[data-part="${part}"]`);
    if (!target) return;
    screen.scrollTo({ top: part === 'brand' ? 0 : target.offsetTop - 24, behavior: reduced ? 'auto' : 'smooth' });
  };

  // Slide in from its side (desktop) or fade in (phones), one after another.
  const enter = (i: number, from: 'left' | 'right' | 'none'): React.CSSProperties =>
    reduced
      ? {}
      : {
          opacity: listIn ? 1 : 0,
          transform: listIn ? 'none' : from === 'left' ? 'translateX(-28px)' : from === 'right' ? 'translateX(28px)' : 'translateY(14px)',
          transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${i * STAGGER_MS}ms, transform .8s cubic-bezier(.16,1,.3,1) ${i * STAGGER_MS}ms, background-color .3s, border-color .3s`,
        };
  const itemStyle = (i: number, from: 'left' | 'right' | 'none'): React.CSSProperties => ({
    ...enter(i, from),
    background: current === i ? 'rgba(253,211,3,.07)' : 'transparent',
    borderColor: current === i ? 'rgba(253,211,3,.28)' : 'rgba(255,255,255,.07)',
  });

  return (
    <RevealSection
      ref={sectionRef}
      id="profile"
      className="scroll-mt-[84px] overflow-hidden border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-[clamp(40px,6vh,72px)] flex flex-wrap items-end justify-between gap-6">
          <h2
            ref={headingRef}
            style={headingStyle}
            className="m-0 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]"
          >
            WHAT THEY SEE
            <br />
            WHEN YOU <span className="text-accent">TAP.</span>
          </h2>
          <p className="m-0 max-w-[320px] text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.52)]">
            Your contact details, socials and links, on their phone in a second.
          </p>
        </div>

        <div ref={listRef}>
          {wide ? (
          /* Desktop: four features, the phone, four features. */
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[clamp(24px,3vw,48px)]">
            <div className="flex flex-col gap-3">
              {FEATURES.slice(0, 4).map((f, i) => (
                <FeatureItem key={f.title} f={f} on={current === i} onPick={() => pick(i)} style={itemStyle(i, 'left')} />
              ))}
            </div>
            <div className="animate-lc-float">
              <PhoneMock profile={profile} active={outline} screenRef={screenRef} onInteract={onInteract} onScroll={onScroll} />
            </div>
            <div className="flex flex-col gap-3">
              {FEATURES.slice(4).map((f, j) => (
                <FeatureItem key={f.title} f={f} on={current === j + 4} onPick={() => pick(j + 4)} style={itemStyle(j + 4, 'right')} />
              ))}
            </div>
          </div>

          ) : (
          /* Phones and tablets: the phone, then a two-column grid. */
          <div>
            <div className="flex justify-center">
              <div className="animate-lc-float">
                <PhoneMock profile={profile} active={outline} screenRef={screenRef} onInteract={onInteract} onScroll={onScroll} />
              </div>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-2.5">
              {FEATURES.map((f, i) => (
                <FeatureItem key={f.title} f={f} on={current === i} onPick={() => pick(i)} style={itemStyle(i, 'none')} compact />
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </RevealSection>
  );
}
