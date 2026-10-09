import { useEffect, useRef, useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';

// "What they see when you tap": sample digital profiles, each in a phone
// frame. Desktop: three phones side by side, the middle one larger and in
// front, all gently floating. Phones: one at a time, swipeable, with dots.
//
// Samples go in src/assets/landing/vcard/ as vcard-1.webp, vcard-2.webp, …
// and are picked up automatically; until then the frames are empty.
const SAMPLE_URLS = import.meta.glob<string>('/src/assets/landing/vcard/vcard-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const SAMPLES: (string | null)[] = (() => {
  const found = Object.entries(SAMPLE_URLS)
    .map(([path, url]) => ({ n: Number(/vcard-(\d+)\.webp$/.exec(path)?.[1] ?? 0), url }))
    .sort((a, b) => a.n - b.n)
    .map((x) => x.url);
  return found.length >= 3 ? found : [...found, ...Array<null>(3 - found.length).fill(null)];
})();

// The desktop row: the middle three samples (or all of them, if three).
const DESKTOP = SAMPLES.length > 3 ? SAMPLES.slice(0, 3) : SAMPLES;

function PhoneFrame({ image, index, className = '' }: { image: string | null; index: number; className?: string }) {
  return (
    <div
      className={`rounded-[42px] p-[10px] ${className}`}
      style={{
        background: 'linear-gradient(160deg, #2A2A30, #101012 55%, #1C1C21)',
        boxShadow: '0 60px 100px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.07)',
      }}
    >
      <div className="relative aspect-[9/19.2] overflow-hidden rounded-[33px] bg-[#0C0C0F]">
        {/* The notch. */}
        <div aria-hidden="true" className="absolute left-1/2 top-[10px] z-[1] h-[18px] w-[34%] -translate-x-1/2 rounded-full bg-[#050506]" />
        {image && (
          <img
            src={image}
            alt={`A sample LuxeCard digital profile (${index + 1})`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  );
}

// One desktop phone: rises in on scroll (staggered), then floats.
function DesktopPhone({ image, index, middle }: { image: string | null; index: number; middle: boolean }) {
  const { ref, style } = useReveal<HTMLDivElement>(index * 120);
  return (
    <div ref={ref} style={style} className={middle ? 'relative z-[2] -mx-6' : 'relative z-[1]'}>
      <div className="animate-lc-float" style={{ animationDelay: `${index * -1.5}s` }}>
        <PhoneFrame image={image} index={index} className={middle ? 'w-[260px]' : 'w-[220px] opacity-90'} />
      </div>
    </div>
  );
}

function MobileCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setActive(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SAMPLES.map((image, i) => (
          <div key={i} className="flex w-full flex-none snap-center justify-center py-6">
            <div className="animate-lc-float">
              <PhoneFrame image={image} index={i} className="w-[min(240px,62vw)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Sample profiles">
        {SAMPLES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={`Sample ${i + 1}`}
            onClick={() => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' })}
            className="h-1.5 rounded-full transition-[width,background-color] duration-300"
            style={{ width: active === i ? 22 : 6, backgroundColor: active === i ? '#FDD303' : 'rgba(255,255,255,.2)' }}
          />
        ))}
      </div>
    </div>
  );
}

export function VCardShowcase() {
  const { ref: headingRef, style: headingStyle } = useReveal<HTMLHeadingElement>();
  return (
    <RevealSection
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

        <div className="md:hidden">
          <MobileCarousel />
        </div>
        <div className="hidden items-center justify-center md:flex">
          {DESKTOP.map((image, i) => (
            <DesktopPhone key={i} image={image} index={i} middle={i === Math.floor(DESKTOP.length / 2)} />
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
