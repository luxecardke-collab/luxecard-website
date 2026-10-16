import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';

function CommissionGlow() {
  const reduced = useReducedMotion();
  const { ref, visible } = useReveal<HTMLDivElement>();
  if (reduced) return null;

  return (
    <div ref={ref} aria-hidden="true" className={`commission-glow-wrap${visible ? ' is-visible' : ''}`}>
      <div className="commission-glow-pulse" />
    </div>
  );
}

export function AffiliateCommissionMoment() {
  return (
    <RevealSection className="relative overflow-hidden bg-ivory px-[clamp(20px,4vw,48px)] py-[clamp(100px,16vh,190px)] text-center text-ink">
      <div className="relative mx-auto max-w-[1000px]">
        <h2 className="m-0 font-manrope text-[clamp(40px,7vw,96px)] font-extrabold leading-[.97] max-md:leading-[1.06] tracking-[-.035em]">
          REFER. SHARE.
          {' '}
          <br />
          <span className="text-accent">EARN</span> 10%.
        </h2>
        <p className="m-0 mt-[26px] text-[clamp(16px,1.3vw,19px)] leading-[1.5] text-[rgba(11,11,13,.62)]">
          On every order placed through your link.
        </p>
      </div>

      <CommissionGlow />
    </RevealSection>
  );
}
