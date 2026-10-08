import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { activeOffer, FINISH_PRICES_BY_LABEL, offerUnitPrice, productId } from '../../api/_lib/pricing';
import { serverNow } from '../utils/serverClock';
import { CARD_FINISHES } from '../data/content';
import { trackMetaEventWithServer } from '../utils/metaPixel';
import { useInquiryModal } from '../context/inquiryModalContext';
import { useAutoCycle } from '../hooks/useAutoCycle';
import { useOffer } from '../hooks/useOffer';
import { OfferBadge, OfferPrice } from './OfferPrice';
import { RevealSection } from './RevealSection';

// Matches the site's other circular secondary controls (the cart button,
// dialog close buttons): a plain border that lights up gold on
// hover/focus, sized to clear the 44px touch-target minimum on mobile.
const NAV_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,.16)] text-ivory transition-colors duration-300 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function Ecosystem() {
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();
  const sectionRef = useRef<HTMLElement>(null);
  const { index, cardIn, priceIn, exitMs, enterMs, priceMs, onCardTransitionEnd, goToNext, goToPrev } = useAutoCycle(
    CARD_FINISHES.length,
    sectionRef
  );
  const finish = CARD_FINISHES[index];
  const offer = useOffer();
  const cardDurationMs = cardIn ? enterMs : exitMs;
  const cardStyle = {
    opacity: cardIn ? 1 : 0,
    transform: cardIn ? 'translateX(0)' : 'translateX(-24px)',
    transition: `opacity ${cardDurationMs}ms cubic-bezier(.16,1,.3,1), transform ${cardDurationMs}ms cubic-bezier(.16,1,.3,1)`,
  };
  const priceStyle = {
    opacity: priceIn ? 1 : 0,
    transform: priceIn ? 'translateX(0)' : 'translateX(-14px)',
    transition: `opacity ${priceMs}ms cubic-bezier(.16,1,.3,1), transform ${priceMs}ms cubic-bezier(.16,1,.3,1)`,
  };

  // Meta ViewContent, once per page view, when the card options are first
  // properly on screen. No-op without cookie consent.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Browser + Conversions API, same event ID. Prices after any offer
        // on right now (by the server's clock).
        const materials = Object.keys(FINISH_PRICES_BY_LABEL);
        const offerNow = activeOffer(serverNow());
        trackMetaEventWithServer('ViewContent', {
          content_type: 'product',
          content_name: 'LuxeCard finishes',
          content_ids: materials.map(productId),
          contents: materials.map((label) => ({
            id: productId(label),
            quantity: 1,
            item_price: offerUnitPrice(FINISH_PRICES_BY_LABEL[label], offerNow),
          })),
          currency: 'KES',
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <RevealSection
      ref={sectionRef}
      id="products"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col gap-[clamp(44px,6vh,72px)] min-[900px]:flex-row min-[900px]:items-stretch">
          <div className="flex flex-col min-[900px]:justify-between">
            <h2 className="m-0 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]">
              CRAFTED TO
              <br />
              IMPRESS.
            </h2>

            <p
              className="m-0 mt-8 hidden max-w-[300px] text-[14.5px] leading-[1.5] text-accent min-[900px]:block"
              style={cardStyle}
            >
              {finish.blurb}
            </p>
          </div>

          {/* Tall enough for the offer badge too, so the card is the same
              height with or without an offer; any spare height goes above
              and below the floating card photo, which stays centred. */}
          <div
            className="group relative mx-auto flex min-h-[500px] w-full sm:min-h-[560px] min-[900px]:min-h-[630px] max-w-[640px] flex-col justify-between overflow-hidden rounded-[20px] border border-[rgba(255,255,255,.08)] p-[clamp(28px,3vw,44px)] transition-colors duration-500 hover:border-[rgba(253,211,3,.34)] min-[900px]:mx-0 min-[900px]:ml-auto min-[900px]:mr-0"
            style={{ background: 'radial-gradient(110% 80% at 70% 20%, #17171B, #0B0B0D 65%)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-inter text-[10px] font-medium tracking-[.15em] text-accent">
                  Four Finishes. One Card.
                </div>
                <h3
                  className="mt-3 flex min-h-[2.3em] items-end font-manrope text-[clamp(24px,2.6vw,32px)] font-semibold leading-[.96] tracking-[-.03em]"
                  style={cardStyle}
                >
                  {finish.name}
                </h3>
                <div className="mt-2 font-inter text-[15px] font-semibold tracking-[.02em] text-accent" style={priceStyle}>
                  <OfferPrice price={FINISH_PRICES_BY_LABEL[finish.priceLabel]} offer={offer} />
                </div>
                {offer && <OfferBadge offer={offer} showEnd className="mt-3" />}
              </div>
              <span className="shrink-0 whitespace-nowrap font-inter text-[10px] font-medium tracking-[.13em] text-grey-1">
                NFC + QR
              </span>
            </div>
            <div
              className="flex flex-1 items-center justify-center py-10 sm:py-14"
              style={cardStyle}
              onTransitionEnd={(e) => {
                if (e.propertyName === 'opacity') onCardTransitionEnd();
              }}
            >
              <img
                src={finish.image}
                alt={finish.alt}
                width={finish.width}
                height={finish.height}
                loading="lazy"
                decoding="async"
                className="animate-lc-float max-h-[168px] w-auto max-w-[74%] rounded-lg sm:max-h-[210px] sm:max-w-[72%] sm:rounded-2xl"
                style={{ boxShadow: '0 50px 90px -40px rgba(0,0,0,.95)' }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => openInquiryModal('individual')}
                onMouseEnter={preloadInquiryModal}
                onFocus={preloadInquiryModal}
                className="inline-flex items-center gap-2.5 text-[14.5px] text-ivory"
              >
                Order Your LuxeCard <span className="font-inter">→</span>
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goToPrev} aria-label="Previous card" className={NAV_BUTTON_CLASS}>
                  <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button type="button" onClick={goToNext} aria-label="Next card" className={NAV_BUTTON_CLASS}>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <p
            className="m-0 -mt-8 max-w-[300px] text-[14.5px] leading-[1.5] text-accent min-[900px]:hidden"
            style={cardStyle}
          >
            {finish.blurb}
          </p>
        </div>
      </div>
    </RevealSection>
  );
}
