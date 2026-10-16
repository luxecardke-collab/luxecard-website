import { Nfc, RefreshCw, Smartphone, type LucideIcon } from 'lucide-react';
import { HERO_TRUST } from '../data/content';
import { useInquiryModal } from '../context/inquiryModalContext';
import { useMountReveal } from '../hooks/useMountReveal';
import { useParallax } from '../hooks/useParallax';
import { HeroTapVisual } from './HeroTapVisual';
import { ShaderAnimation } from './ShaderAnimation';

export function Hero() {
  const textStyle = useMountReveal(80);
  const visualStyle = useMountReveal(280);
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();
  const shaderParallaxRef = useParallax<HTMLDivElement>(0.12);

  return (
    <section
      id="top"
      className="relative overflow-hidden px-[clamp(20px,4vw,48px)] pb-[clamp(64px,9vh,120px)] pt-[clamp(36px,calc(15vh-84px),96px)] min-[900px]:pt-[clamp(24px,calc(15vh-80px),84px)]"
      style={{ background: 'radial-gradient(120% 90% at 78% 10%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
    >
      <div ref={shaderParallaxRef} className="absolute inset-x-0 -top-[20%] -bottom-[20%]">
        <ShaderAnimation />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-base))' }}
      />
      <div
        className="relative z-[1] mx-auto grid max-w-[1320px] items-center gap-[clamp(48px,6vw,80px)] min-[900px]:min-h-[clamp(480px,62vh,650px)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}
      >
        <div style={textStyle}>
          {/* The page's H1: what it is, in the site's small-label style. */}
          <h1 className="m-0 mb-4 whitespace-nowrap font-inter text-[11px] font-medium uppercase leading-[16px] tracking-[.14em] text-accent">NFC Business Cards in Kenya</h1>
          {/* The slogan (not a heading). */}
          <div className="hero-title m-0 mb-7 font-manrope font-extrabold leading-[.96] max-md:leading-[1.06] tracking-[-0.035em]">
            YOUR
            {' '}
            <br />
            <span className="whitespace-nowrap">BUSINESS CARD,</span>
            {' '}
            <br />
            <span className="text-accent">UPGRADED.</span>
          </div>

          <p className="m-0 mb-10 max-w-[460px] text-[clamp(16px,1.35vw,19px)] leading-[1.35] text-[rgba(243,240,234,.6)] text-pretty min-[900px]:leading-[1.55]">
            Share your contact, socials and more with one tap or scan.
          </p>

          <div className="flex flex-nowrap items-center gap-x-[clamp(10px,4vw,24px)]">
            <button
              type="button"
              onClick={() => openInquiryModal('individual')}
              onMouseEnter={preloadInquiryModal}
              onFocus={preloadInquiryModal}
              className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-ivory px-[clamp(16px,5vw,30px)] py-[clamp(12px,3.5vw,17px)] text-[clamp(12.5px,3.2vw,15.5px)] font-semibold text-bg transition-[transform,box-shadow] duration-[.4s] ease-lux hover:-translate-y-[3px]"
              style={{ boxShadow: '0 18px 44px -22px rgba(243,240,234,.6)' }}
            >
              Order Your LuxeCard
            </button>
            <a
              href="#how"
              className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap border-b border-[rgba(255,255,255,.14)] py-[15px] text-[clamp(12.5px,3.2vw,15.5px)] text-[rgba(243,240,234,.78)] transition-colors duration-300 hover:border-accent hover:text-ivory"
            >
              See How It Works <span className="font-inter">→</span>
            </a>
          </div>

          <div className="mt-[clamp(44px,6vh,72px)] flex flex-wrap gap-x-9 gap-y-6 font-inter text-[10.5px] font-medium tracking-[.15em] text-grey-1">
            {HERO_TRUST.map((t) => {
              const Icon = HERO_TRUST_ICONS[t];
              return (
                <div key={t} className="flex flex-col items-center gap-2.5">
                  <Icon size={18} strokeWidth={1.6} className="text-accent" aria-hidden="true" />
                  <span>
                    {HERO_TRUST_SHORT[t] ? (
                      <>
                        <span className="min-[400px]:hidden">{HERO_TRUST_SHORT[t]}</span>
                        <span className="hidden min-[400px]:inline">{t}</span>
                      </>
                    ) : (
                      t
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={visualStyle}>
          <HeroTapVisual />
        </div>
      </div>
    </section>
  );
}

const HERO_TRUST_ICONS: Record<(typeof HERO_TRUST)[number], LucideIcon> = {
  'NFC + QR': Nfc,
  'NO APP TO VIEW': Smartphone,
  'UPDATE ANYTIME': RefreshCw,
};

// Below 400px the full labels wrap the third item onto its own line; a
// shorter label for "NO APP TO VIEW" is enough on its own to keep all three
// on one line at every width this site supports, so it's the only one that
// needs a short form.
const HERO_TRUST_SHORT: Partial<Record<(typeof HERO_TRUST)[number], string>> = {
  'NO APP TO VIEW': 'NO APP',
};
