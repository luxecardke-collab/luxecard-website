import { AFFILIATE_FAQS } from '../data/affiliate';
import { useReveal } from '../hooks/useReveal';
import { FaqAccordion } from './FaqAccordion';
import { RevealSection } from './RevealSection';

export function AffiliateFaqSection() {
  const { ref, style } = useReveal<HTMLHeadingElement>();

  return (
    <RevealSection
      id="affiliate-faqs"
      data-whatsapp-landmark="faq"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1000px]">
        <h2
          ref={ref}
          style={style}
          className="m-0 mb-[clamp(36px,5vh,60px)] font-manrope text-[clamp(32px,4.4vw,58px)] font-bold leading-[.98] max-md:leading-[1.06] tracking-[-.032em]"
        >
          QUESTIONS,
          <br />
          ANSWERED.
        </h2>
        <FaqAccordion faqs={AFFILIATE_FAQS} />
      </div>
    </RevealSection>
  );
}
