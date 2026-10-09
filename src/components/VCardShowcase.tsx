import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Globe, LayoutGrid, Mail, MessageCircle, Phone, Smartphone, UserPlus } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';

// "What they see when you tap": a sample LuxeCard digital profile, built in
// HTML/CSS inside a phone frame, beside a list of what's on it. Everything in
// the sample is invented (Amara Wanjiru, Savannah & Co.) and nothing in it is
// clickable. The profile scrolls itself slowly (not with reduced motion) and
// stops while the visitor scrolls it; picking a feature scrolls the phone to
// that part and highlights it. The profile's contents are only built once
// the section is near the screen, so they never weigh on the first screen.

type Part = 'brand' | 'story' | 'actions' | 'contact' | 'qr' | 'inquiries' | 'add';

const FEATURES: { part: Part; title: string; body: string }[] = [
  { part: 'brand', title: 'Your brand, front and centre', body: 'Logo, photo, name, title and company.' },
  { part: 'story', title: 'Your story', body: 'A tagline and a short bio about you or your business.' },
  { part: 'actions', title: 'One-tap actions', body: 'Your website and WhatsApp, a tap away.' },
  { part: 'contact', title: 'Contact details', body: 'Email and phone numbers, ready to tap.' },
  { part: 'qr', title: 'Your QR code', body: 'Anyone can scan it to open your profile, even without NFC.' },
  { part: 'inquiries', title: 'Inquiries form', body: 'People can send you a message straight from your profile.' },
  { part: 'add', title: 'Add to contact', body: 'Your details saved to their phone in one tap.' },
  { part: 'brand', title: 'Always up to date', body: 'Change your details any time, with no new card needed.' },
];

const GOLD = '#D9B45A';
const NAVY = '#0E1626';

// Auto-scroll speed (px per second), pauses (ms) and how long after the
// visitor's last touch it starts again.
const SCROLL_SPEED = 28;
const PAUSE_MS = 2200;
const RESUME_AFTER_MS = 6000;

// ---------------------------------------------------------------- the QR code

// A decorative QR-style pattern (not scannable): the three finder squares and
// a fixed pseudo-random fill, the same on every render.
function DecorativeQr({ size }: { size: number }) {
  const n = 21;
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const cells: ReactNode[] = [];
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const on = rand() > 0.52;
      if (!inFinder(x, y) && on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} aria-hidden="true" className="rounded-md bg-white">
      <g fill={NAVY}>
        {cells}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- the profile

function Avatar({ size }: { size: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-manrope font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(140deg, ${GOLD}, #8A6A22)`, border: `3px solid ${NAVY}` }}
    >
      AW
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-2 text-[13px] font-semibold text-white">
      {children}
      <span className="h-px flex-1" style={{ background: `${GOLD}66` }} />
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD, color: NAVY }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] uppercase tracking-[.08em] text-[rgba(255,255,255,.5)]">{label}</span>
        <span className="block truncate text-[11.5px] text-white">{value}</span>
      </span>
    </div>
  );
}

function Field({ children, tall = false }: { children: string; tall?: boolean }) {
  return (
    <div
      className={`mb-2 rounded-[10px] px-3 text-[11px] text-[rgba(14,22,38,.55)] ${tall ? 'h-16 pt-2.5' : 'flex h-9 items-center'}`}
      style={{ background: GOLD }}
    >
      {children}
    </div>
  );
}

// The highlight around a part the visitor picked from the list.
function partClass(active: Part | null, part: Part) {
  return `rounded-xl transition-shadow duration-500 ${active === part ? 'shadow-[0_0_0_2px_#FDD303]' : 'shadow-none'}`;
}

function SampleProfile({ active }: { active: Part | null }) {
  return (
    <div className="pb-20 text-left font-inter" style={{ background: NAVY }}>
      <div data-part="brand">
        {/* Banner with the logo and the language button */}
        <div className="relative flex h-[118px] items-center justify-center bg-white">
          <span className="font-manrope text-[17px] font-extrabold tracking-[.14em]" style={{ color: NAVY }}>
            SAVANNAH <span style={{ color: '#B8892A' }}>&amp;</span> CO.
          </span>
          <span
            className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold"
            style={{ borderColor: `${NAVY}33`, color: NAVY }}
          >
            EN <ChevronDown size={10} strokeWidth={2.4} aria-hidden="true" />
          </span>
        </div>
        <div className={`relative z-[1] mx-3 -mt-9 flex flex-col items-center px-2 pb-1 text-center ${partClass(active, 'brand')}`}>
          <Avatar size={76} />
          <div className="mt-2.5 font-manrope text-[17px] font-bold text-white">Amara Wanjiru</div>
          <div className="mt-0.5 text-[11px] text-[rgba(255,255,255,.7)]">Head of Partnerships</div>
          <div className="text-[11px] text-[rgba(255,255,255,.7)]">Savannah &amp; Co.</div>
        </div>
      </div>

      <div data-part="story" className={`mx-3 mt-2 px-2 py-1.5 text-center ${partClass(active, 'story')}`}>
        <div className="text-[12px] font-semibold" style={{ color: GOLD }}>
          Building partnerships that last.
        </div>
        <div className="mt-3 text-[12px] font-bold text-white">Savannah &amp; Co.</div>
        <p className="m-0 mt-1 text-[10.5px] leading-[1.55] text-[rgba(255,255,255,.65)]">
          Savannah &amp; Co. is an advisory firm helping growing East African businesses find the right partners. We
          connect founders with investors, suppliers and distributors, and stay with them as those partnerships grow.
        </p>
      </div>

      <div data-part="actions" className={`mx-auto mt-4 flex w-fit gap-4 p-2 ${partClass(active, 'actions')}`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: GOLD, color: NAVY }}>
          <Globe size={19} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white">
          <MessageCircle size={19} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <div data-part="contact" className={`mx-3 px-2 pb-1 ${partClass(active, 'contact')}`}>
        <SectionTitle>Contact</SectionTitle>
        <ContactRow icon={<Mail size={14} strokeWidth={2} aria-hidden="true" />} label="Email" value="amara@yourcompany.co.ke" />
        <ContactRow icon={<Phone size={14} strokeWidth={2} aria-hidden="true" />} label="Phone" value="+254 7XX XXX XXX" />
        <ContactRow icon={<Smartphone size={14} strokeWidth={2} aria-hidden="true" />} label="Mobile" value="+254 7XX XXX XXX" />
      </div>

      <div data-part="qr" className={`mx-3 px-2 pb-2 ${partClass(active, 'qr')}`}>
        <SectionTitle>QR Code</SectionTitle>
        <div className="flex items-center justify-center gap-4">
          <Avatar size={64} />
          <DecorativeQr size={86} />
        </div>
      </div>

      <div data-part="inquiries" className={`mx-3 px-2 pb-2 ${partClass(active, 'inquiries')}`}>
        <SectionTitle>Inquiries</SectionTitle>
        <Field>Your Name</Field>
        <Field>Email Address</Field>
        <Field>Enter Phone Number</Field>
        <Field tall>Type a message here…</Field>
        <div className="mt-1 flex h-9 items-center justify-center rounded-[10px] border text-[11.5px] font-semibold" style={{ borderColor: GOLD, color: GOLD }}>
          Send Message
        </div>
      </div>

      <div className="mt-6 text-center text-[10px] text-[rgba(255,255,255,.45)]">Made by LuxeCard</div>
    </div>
  );
}

// ---------------------------------------------------------------- the phone

function PhoneMock({ near, active, screenRef, onInteract }: {
  near: boolean;
  active: Part | null;
  screenRef: React.RefObject<HTMLDivElement | null>;
  onInteract: () => void;
}) {
  return (
    <div
      className="w-[min(290px,74vw)] rounded-[44px] p-[10px] md:w-[300px]"
      style={{ background: 'linear-gradient(160deg, #2A2A30, #101012 55%, #1C1C21)', boxShadow: '0 60px 100px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.07)' }}
    >
      <div className="relative aspect-[9/19.2] overflow-hidden rounded-[35px]" style={{ background: NAVY }}>
        <div aria-hidden="true" className="absolute left-1/2 top-[9px] z-[3] h-[18px] w-[32%] -translate-x-1/2 rounded-full bg-black" />
        {/* The profile itself: the visitor can scroll it (Lenis leaves it alone). */}
        <div
          ref={screenRef}
          data-lenis-prevent
          aria-hidden="true"
          onWheel={onInteract}
          onTouchStart={onInteract}
          onPointerDown={onInteract}
          className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {near && <SampleProfile active={active} />}
        </div>
        {near && (
          <>
            <span
              aria-hidden="true"
              className="absolute right-3 top-[132px] z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg"
              style={{ color: NAVY }}
            >
              <LayoutGrid size={16} strokeWidth={2} />
            </span>
            <span
              aria-hidden="true"
              className={`absolute inset-x-4 bottom-4 z-[2] flex h-10 items-center justify-center gap-2 rounded-full border text-[12px] font-semibold transition-shadow duration-500 ${
                active === 'add' ? 'shadow-[0_0_0_2px_#FDD303]' : ''
              }`}
              style={{ borderColor: GOLD, color: GOLD, background: `${NAVY}E6` }}
            >
              <UserPlus size={14} strokeWidth={2} /> Add to contact
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the section

export function VCardShowcase() {
  const reduced = useReducedMotion();
  const { ref: headingRef, style: headingStyle } = useReveal<HTMLHeadingElement>();
  const sectionRef = useRef<HTMLElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState<Part | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const lastTouch = useRef(0);
  const highlightTimer = useRef<number | undefined>(undefined);

  // Build the profile once the section is within a screen or so; run the
  // auto-scroll only while it's on screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' });
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    nearIo.observe(el);
    viewIo.observe(el);
    return () => {
      nearIo.disconnect();
      viewIo.disconnect();
    };
  }, []);

  const onInteract = useCallback(() => {
    lastTouch.current = performance.now();
  }, []);

  // Slowly down to the bottom, pause, back to the top, pause, again.
  useEffect(() => {
    if (reduced || !near || !inView) return;
    const screen = screenRef.current;
    if (!screen) return;
    let raf = 0;
    let prev = performance.now();
    let phase: 'down' | 'pause-bottom' | 'up' | 'pause-top' = 'pause-top';
    let phaseStart = prev;
    let pos = screen.scrollTop;
    const tick = (now: number) => {
      const dt = Math.min(now - prev, 64);
      prev = now;
      if (now - lastTouch.current < RESUME_AFTER_MS) {
        // The visitor is (or was just) scrolling: leave it to them.
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
  }, [reduced, near, inView]);

  const pick = (i: number) => {
    const { part } = FEATURES[i];
    const screen = screenRef.current;
    lastTouch.current = performance.now();
    setPicked(i);
    setActive(part);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setActive(null), 2600);
    if (!screen) return;
    if (part === 'add') return; // pinned at the bottom of the screen
    const target = screen.querySelector<HTMLElement>(`[data-part="${part}"]`);
    if (!target) return;
    const top = part === 'brand' ? 0 : target.offsetTop - 24;
    screen.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  };

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

        <div className="grid items-center gap-[clamp(40px,5vw,80px)] md:grid-cols-[auto_1fr]">
          <div className="flex justify-center md:pl-[clamp(0px,4vw,60px)]">
            <div className="animate-lc-float">
              <PhoneMock near={near} active={active} screenRef={screenRef} onInteract={onInteract} />
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {FEATURES.map((f, i) => (
              <li key={f.title}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  className="w-full rounded-[14px] border px-5 py-4 text-left transition-colors duration-300"
                  style={{
                    background: picked === i ? 'rgba(253,211,3,.07)' : 'transparent',
                    borderColor: picked === i ? 'rgba(253,211,3,.28)' : 'rgba(255,255,255,.07)',
                  }}
                >
                  <span className="block font-manrope text-[17px] font-medium tracking-[-.02em] text-ivory">{f.title}</span>
                  <span className="mt-1 block text-[14px] leading-[1.5] text-[rgba(243,240,234,.5)]">{f.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RevealSection>
  );
}
