import { useRef, type ReactNode } from 'react';
import { STAGES, type Stage } from '../data/content';
import { useHowItWorksStage } from '../hooks/useHowItWorksStage';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReveal } from '../hooks/useReveal';
import { stackScale, useScrollSpread } from '../hooks/useScrollSpread';
import { RevealSection } from './RevealSection';
import { useSampleProfile } from '../hooks/useSampleProfile';

function StepButton({
  s,
  active,
  onSelect,
  solidBg,
  index = 0,
}: {
  s: Stage;
  active: boolean;
  onSelect: () => void;
  solidBg?: boolean;
  index?: number;
}) {
  const { ref, style: revealStyle } = useReveal<HTMLDivElement>(index * 70);

  return (
    <div ref={ref} style={revealStyle}>
      <button
        type="button"
        onClick={onSelect}
        className="grid w-full items-start gap-4 rounded-[14px] border px-5 py-[22px] text-left transition-colors duration-[.45s]"
        style={{
          gridTemplateColumns: '44px 1fr',
          background: solidBg ? '#101013' : active ? 'rgba(253,211,3,.07)' : 'transparent',
          borderColor: active ? 'rgba(253,211,3,.28)' : 'rgba(255,255,255,.07)',
        }}
      >
        <span className="pt-1 font-inter text-[11px] tracking-[.1em]" style={{ color: active ? '#FDD303' : '#8C8A85' }}>
          {s.index}
        </span>
        <span>
          <span
            className="block font-manrope text-[clamp(20px,2.2vw,27px)] font-medium tracking-[-.03em]"
            style={{ color: active ? '#F3F0EA' : 'rgba(243,240,234,.55)' }}
          >
            {s.title}
          </span>
          <span className="mt-1.5 block max-w-[380px] text-[14.5px] leading-[1.55] text-[rgba(243,240,234,.5)]">
            {s.body}
          </span>
        </span>
      </button>
    </div>
  );
}

function MobileStackedSteps({ stage, select }: { stage: number; select: (i: number) => void }) {
  const { containerRef, cardRefs } = useScrollSpread('y');

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {STAGES.map((s, i) => (
        <div
          key={s.index}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          style={{ transform: `scale(${stackScale(i)})`, willChange: 'transform' }}
        >
          <StepButton s={s} active={stage === i} onSelect={() => select(i)} solidBg index={i} />
        </div>
      ))}
    </div>
  );
}

function DesktopSteps({ stage, select }: { stage: number; select: (i: number) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {STAGES.map((s, i) => (
        <StepButton key={s.index} s={s} active={stage === i} onSelect={() => select(i)} index={i} />
      ))}
    </div>
  );
}

// The card pages pass their own heading and a note under the steps; the
// homepage uses the defaults.
const DEFAULT_HEADING = 'HOW IT WORKS';

export function HowItWorks({
  heading = DEFAULT_HEADING,
  intro = 'Four simple steps to a more powerful connection.',
  note,
}: {
  heading?: ReactNode;
  intro?: string;
  note?: string;
} = {}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { stage, select } = useHowItWorksStage(sectionRef, !isMobile);
  // The sample profile's code, fetched as the section nears the screen.
  const profile = useSampleProfile(sectionRef);


  return (
    <RevealSection
      ref={sectionRef}
      id="how"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] bg-[var(--bg-base)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-[clamp(48px,7vh,88px)] flex flex-wrap items-end justify-between gap-6">
          <h2
            // A longer card-page heading may wrap on phones.
            className={`m-0 shrink-0 font-manrope text-[clamp(38px,5.6vw,72px)] font-bold leading-none max-md:leading-[1.06] tracking-[-.032em] min-[900px]:whitespace-nowrap${
              heading === DEFAULT_HEADING ? '' : ' max-w-full'
            }`}
            style={{ wordSpacing: '.18em' }}
          >
            {heading}
          </h2>
          <p className="m-0 max-w-[320px] text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.52)]">
            {intro}
          </p>
        </div>

        <div
          className="grid items-center gap-[clamp(40px,5vw,80px)]"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}
        >
          {isMobile ? (
            <MobileStackedSteps stage={stage} select={select} />
          ) : (
            <DesktopSteps stage={stage} select={select} />
          )}

          <div className="hidden justify-center md:flex">
            <div
              className="relative w-[clamp(280px,32vw,360px)] rounded-[50px] p-3"
              style={{
                background: 'linear-gradient(160deg, #2A2A30, #101012 55%, #1C1C21)',
                boxShadow: '0 70px 120px -55px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.07)',
              }}
            >
              <div className="relative aspect-[9/19.2] overflow-hidden rounded-[39px] bg-[#0C0C0F]">
                {/* Charcoal over the light sample profile (Open, Connect). */}
                <div
                  className={`absolute inset-x-0 top-[15px] z-[5] flex justify-between px-[22px] font-inter text-[10px] ${
                    stage === 1 || stage === 2 ? 'text-[rgba(31,31,31,.6)]' : 'text-[rgba(243,240,234,.5)]'
                  }`}
                >
                  <span>9:41</span>
                  <span>LTE</span>
                </div>

                {stage === 0 && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute left-1/2 top-0 h-[130px] w-[130px]"
                      style={{ transform: 'translate(-50%, -50%)' }}
                    >
                      {[0, 0.7, 1.4].map((delay) => (
                        <span
                          key={delay}
                          className="absolute inset-0 animate-lc-ripple rounded-full border"
                          style={{ borderColor: 'rgba(253,211,3,.4)', animationDelay: `${delay}s` }}
                        />
                      ))}
                    </div>

                    <div className="flex h-full flex-col items-center justify-center">
                      <div
                        className="flex h-[104px] w-[104px] items-center justify-center rounded-full border font-inter text-[10px] tracking-[.14em] text-accent"
                        style={{ borderColor: 'rgba(253,211,3,.3)', background: '#0C0C0F' }}
                      >
                        TAP
                      </div>
                    </div>
                  </div>
                )}

                {/* Open and Connect: the top of the sample profile, still. */}
                {(stage === 1 || stage === 2) && (
                  <div className="absolute inset-0 overflow-hidden">
                    {/* Scrolls by hand only (Lenis leaves it alone); the page
                        scrolls as usual outside the phone. No QR Code part,
                        so nothing sits behind "Add to contact". */}
                    <div
                      data-lenis-prevent
                      className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {profile && <profile.SampleProfile hideQr />}
                    </div>
                    {profile && <profile.ProfileOverlays />}
                  </div>
                )}

                {stage === 3 && (
                  <div className="absolute inset-0 flex flex-col gap-3 bg-bg-alt px-5 pb-5 pt-[52px]">
                    <div className="font-inter text-[9px] font-medium tracking-[.14em] text-grey-1">
                      AFTER THE CONVERSATION
                    </div>
                    <div className="flex items-center gap-3 rounded-[13px] bg-[rgba(255,255,255,.04)] p-3.5">
                      <div
                        className="h-[38px] w-[38px] rounded-full"
                        style={{ background: 'repeating-linear-gradient(45deg, #22222A 0 6px, #1A1A20 6px 12px)' }}
                      />
                      <div>
                        <div className="text-[12.5px]">Amara Wanjiru</div>
                        <div className="text-[10px] text-[rgba(243,240,234,.45)]">Saved to contacts</div>
                      </div>
                    </div>
                    <div
                      className="rounded-[13px] border p-3.5"
                      style={{ borderColor: 'rgba(253,211,3,.24)', background: 'rgba(253,211,3,.07)' }}
                    >
                      <div className="text-xs text-ivory">
                        “Great meeting you at the summit. Sending the deck over.”
                      </div>
                      <div className="mt-2.5 font-inter text-[8.5px] tracking-[.14em] text-grey-1">
                        FOLLOW-UP SENT
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-[7px]">
                      {['Share your profile back', 'Book a meeting'].map((label) => (
                        <div
                          key={label}
                          className="flex justify-between rounded-[11px] bg-[rgba(255,255,255,.035)] px-[13px] py-3 text-[11.5px] text-[rgba(243,240,234,.75)]"
                        >
                          {label}
                          <span className="text-[#55534F]">→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {note && (
          <p className="m-0 mt-[clamp(36px,5vh,56px)] text-[14.5px] leading-[1.6] text-[rgba(243,240,234,.5)]">{note}</p>
        )}
      </div>
    </RevealSection>
  );
}
