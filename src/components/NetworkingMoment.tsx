import { useScrollGlow, RESTING_OPACITY } from '../hooks/useScrollGlow';
import { RevealSection } from './RevealSection';

export function NetworkingMoment() {
  const { sectionRef, glowRefs, scrollResponsive } = useScrollGlow<HTMLElement>(0.15);

  return (
    <RevealSection
      ref={sectionRef}
      className="relative flex min-h-[clamp(260px,40vh,400px)] items-end border-t border-[rgba(255,255,255,.06)] [overflow-x:clip]"
      style={{ background: '#08080A' }}
    >
      <div
        aria-hidden="true"
        ref={(el) => {
          glowRefs.current[0] = el;
        }}
        className="absolute -left-[12%] top-[-20%] aspect-square w-[55%]"
        style={scrollResponsive ? { opacity: RESTING_OPACITY } : undefined}
      >
        <div
          className="h-full w-full animate-lc-glow rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(253,211,3,.4), transparent 70%)', mixBlendMode: 'screen' }}
        />
      </div>
      <div
        aria-hidden="true"
        ref={(el) => {
          glowRefs.current[1] = el;
        }}
        className="absolute -right-[10%] bottom-[-25%] aspect-square w-[48%]"
        style={scrollResponsive ? { opacity: RESTING_OPACITY } : undefined}
      >
        <div
          className="h-full w-full animate-lc-glow rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(243,240,234,.22), transparent 70%)',
            mixBlendMode: 'screen',
            animationDelay: '2.4s',
          }}
        />
      </div>
      <div className="relative mx-auto w-full max-w-[1320px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,8vh,96px)] min-[900px]:pt-[clamp(56px,8vh,96px)]">
        <h2 className="m-0 mb-6 font-manrope text-[clamp(38px,6.4vw,88px)] font-extrabold leading-[.98] max-md:leading-[1.06] tracking-[-.035em]">
          MEET ONCE.
          {' '}
          <br />
          STAY CONNECTED.
        </h2>
        <p className="m-0 max-w-[480px] text-[clamp(15.5px,1.3vw,18px)] leading-[1.6] text-[rgba(243,240,234,.6)]">
          Turn real-world introductions into digital connections that don’t disappear when the event ends.
        </p>
      </div>
    </RevealSection>
  );
}
