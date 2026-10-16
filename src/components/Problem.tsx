import { PROBLEM } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';

export function Problem() {
  const { ref: headingRef, style: headingStyle } = useReveal<HTMLHeadingElement>();
  const { ref: oldWayRef, style: oldWayStyle } = useReveal<HTMLDivElement>();
  const { ref: luxeCardRef, style: luxeCardStyle } = useReveal<HTMLDivElement>(90);

  return (
    <RevealSection className="border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)]">
      <div className="mx-auto max-w-[1320px]">
        <h2
          ref={headingRef}
          style={headingStyle}
          className="m-0 mb-[clamp(44px,6vh,76px)] max-w-[900px] font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]"
        >
          DIGITIZING NETWORKING
          {' '}
          <br />
          ACROSS AFRICA.
        </h2>
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}
        >
          <div
            ref={oldWayRef}
            style={oldWayStyle}
            className="rounded-[18px] border border-[rgba(255,255,255,.07)] bg-surface p-[clamp(28px,3vw,44px)]"
          >
            <div className="mb-7 font-inter text-[10px] font-medium tracking-[.15em] text-[#55534F]">
              TRADITIONAL BUSINESS CARDS
            </div>
            <ul className="flex flex-col gap-3.5 font-manrope text-[clamp(20px,2.4vw,30px)] tracking-[-.03em] text-[rgba(243,240,234,.3)]">
              {PROBLEM.oldWay.map((line, i) => {
                const isLast = i === PROBLEM.oldWay.length - 1;
                return (
                  <li key={line} className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-[.6em] h-[6px] w-[6px] shrink-0 rounded-full bg-[rgba(243,240,234,.3)]" />
                    <span className={isLast ? 'line-through decoration-1' : undefined}>{line}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div
            ref={luxeCardRef}
            className="rounded-[18px] border p-[clamp(28px,3vw,44px)]"
            style={{
              ...luxeCardStyle,
              borderColor: 'rgba(253,211,3,.22)',
              background: 'linear-gradient(160deg, #13120F, #0C0C0E 70%)',
            }}
          >
            <div className="mb-7 font-inter text-[10px] font-medium tracking-[.15em] text-accent">
              LUXECARD DIGITAL NETWORKING
            </div>
            <ul className="flex flex-col gap-3.5 font-manrope text-[clamp(20px,2.4vw,30px)] tracking-[-.03em]">
              {PROBLEM.luxeCard.map((line, i) => {
                const isLast = i === PROBLEM.luxeCard.length - 1;
                return (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-[.6em] h-[6px] w-[6px] shrink-0 rounded-full ${isLast ? 'bg-accent' : 'bg-[rgba(243,240,234,.55)]'}`}
                    />
                    <span className={isLast ? 'text-accent' : undefined}>{line}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
