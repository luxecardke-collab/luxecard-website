import { FOR_BUSINESS_BENEFITS } from '../data/content';
import { useInquiryModal } from '../context/inquiryModalContext';
import { RevealSection } from './RevealSection';
import { WHATSAPP_SOURCES, whatsappLinkProps } from '../utils/whatsapp';

export function ForBusiness() {
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();

  return (
    <RevealSection
      id="business"
      className="scroll-mt-[84px] bg-ivory px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] text-ink min-[900px]:scroll-mt-[80px]"
    >
      <div
        className="mx-auto grid max-w-[1320px] gap-[clamp(40px,5vw,72px)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}
      >
        <div>
          <div className="mb-[26px] font-inter text-[10px] font-medium tracking-[.15em] text-[#7A7770]">
            FOR BUSINESS
          </div>
          <h2 className="m-0 mb-6 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.95] max-md:leading-[1.06] tracking-[-.032em]">
            ONE NETWORK.
            <br />
            YOUR ENTIRE TEAM.
          </h2>
          <p className="m-0 mb-9 max-w-[440px] text-[16.5px] leading-[1.6] text-[rgba(11,11,13,.62)]">
            Equip your team with branded digital identities — consistent, centrally managed, deployed in one order.
          </p>
          <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5">
            <button
              type="button"
              onClick={() => openInquiryModal('business')}
              onMouseEnter={preloadInquiryModal}
              onFocus={preloadInquiryModal}
              className="inline-flex items-center gap-2.5 rounded-full border-0 bg-ink px-[30px] py-[17px] text-[15.5px] font-semibold text-ivory transition-transform duration-[.4s] ease-lux hover:-translate-y-[3px]"
            >
              Equip Your Team <span className="font-inter">→</span>
            </button>
            <a
              {...whatsappLinkProps(WHATSAPP_SOURCES.forBusiness, { newTab: false })}
              className="border-b border-[rgba(11,11,13,.2)] pb-[3px] text-[15.5px] text-[rgba(11,11,13,.7)] transition-colors hover:border-ink hover:text-ink"
            >
              Talk to LuxeCard
            </a>
          </div>
        </div>
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', background: 'rgba(11,11,13,.12)' }}
        >
          {FOR_BUSINESS_BENEFITS.map((b) => (
            <div key={b.title} className="bg-ivory px-[22px] py-[26px]">
              <div className="font-manrope text-[19px] tracking-[-.02em]">{b.title}</div>
              <p className="m-0 mt-2 text-sm leading-[1.55] text-[rgba(11,11,13,.55)]">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
