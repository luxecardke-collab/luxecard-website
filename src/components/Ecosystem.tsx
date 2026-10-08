import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { activeOffer, FINISH_PRICES_BY_LABEL, offerUnitPrice, productId } from '../../api/_lib/pricing';
import { serverNow } from '../utils/serverClock';
import { CARD_FINISHES, type CardFinish } from '../data/content';
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

// The card pages show their own card(s) here, with their own heading and
// label; their Order button goes to the page's order form, and they send
// their own ViewContent. The homepage uses the defaults.
export function Ecosystem({
  id = 'products',
  heading,
  label = 'Four Finishes. One Card.',
  items = CARD_FINISHES,
  onOrder,
  orderLabel,
  trackViewContent = true,
}: {
  id?: string;
  heading?: ReactNode;
  // null: no label above the card's name (the card pages).
  label?: string | null;
  items?: CardFinish[];
  onOrder?: () => void;
  // The Order button's text from 640px (a card page names its card); on
  // phones it's "Get yours", which fits beside the chevrons.
  orderLabel?: string;
  trackViewContent?: boolean;
} = {}) {
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();
  const sectionRef = useRef<HTMLElement>(null);
  const { index, cardIn, priceIn, exitMs, enterMs, priceMs, onCardTransitionEnd, goToNext, goToPrev } = useAutoCycle(
    items.length,
    sectionRef
  );
  const finish = items[index];
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
    if (!section || !trackViewContent) return;
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
  }, [trackViewContent]);

  return (
    <RevealSection
      ref={sectionRef}
      id={id}
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col gap-[clamp(44px,6vh,72px)] min-[900px]:flex-row min-[900px]:items-stretch">
          <div className="flex flex-col min-[900px]:justify-between">
            <h2 className="m-0 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]">
              {heading ?? (
                <>
                  CRAFTED TO
                  <br />
                  IMPRESS.
                </>
              )}
            </h2>

            <p
              className="m-0 mt-8 hidden max-w-[300px] text-[14.5px] leading-[1.5] text-accent min-[900px]:block"
              style={cardStyle}
            >
              {finish.blurb}
            </p>
          </div>

          {/* Its height comes from its contents, the same for every card
              (the photo sits in a fixed-size frame), so switching cards never
              changes it; only the offer badge adds height while an offer is on. */}
          <div
            className="group relative mx-auto flex w-full max-w-[640px] flex-col justify-between overflow-hidden rounded-[20px] border border-[rgba(255,255,255,.08)] p-[clamp(28px,3vw,44px)] transition-colors duration-500 hover:border-[rgba(253,211,3,.34)] min-[900px]:mx-0 min-[900px]:ml-auto min-[900px]:mr-0"
            style={{ background: 'radial-gradient(110% 80% at 70% 20%, #17171B, #0B0B0D 65%)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                {label && (
                  <div className="font-inter text-[10px] font-medium tracking-[.15em] text-accent">
                    {label}
                  </div>
                )}
                <h3
                  className={`${label ? 'mt-3 ' : ''}flex min-h-[2.3em] items-end font-manrope text-[clamp(24px,2.6vw,32px)] font-semibold leading-[.96] tracking-[-.03em]`}
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
            {/* Space around the floating photo. The float lifts it up to 16px,
                so below 900px it rests 16px lower in that space (pt 16px more
                than pb): the gap above it at the float's highest point then
                matches the gap below it at its lowest. */}
            <div
              className="flex flex-1 items-center justify-center pb-[52px] pt-[68px] min-[900px]:py-[59px]"
              style={cardStyle}
              onTransitionEnd={(e) => {
                if (e.propertyName === 'opacity') onCardTransitionEnd();
              }}
            >
              {/* A fixed frame the size of the tallest card photo (210px high
                  on desktop), so every card photo fits it at the same size it
                  always had. */}
              <div className="flex aspect-[960/574] w-[74%] max-w-[281px] items-center justify-center sm:w-[72%] sm:max-w-[351px] min-[900px]:aspect-auto min-[900px]:h-[210px] min-[900px]:max-w-[367px]">
                <img
                  src={finish.image}
                  alt={finish.alt}
                  width={finish.width}
                  height={finish.height}
                  loading="lazy"
                  decoding="async"
                  className="animate-lc-float h-auto max-h-full w-auto max-w-full rounded-lg sm:rounded-2xl"
                  style={{ boxShadow: '0 50px 90px -40px rgba(0,0,0,.95)' }}
                />
              </div>
            </div>
            {/* Below 390px, slightly tighter spacing and text keep "Order Your
                LuxeCard →" on one line; the chevrons stay where they are. */}
            <div className="flex items-center justify-between gap-2 min-[390px]:gap-4">
              <button
                type="button"
                onClick={onOrder ?? (() => openInquiryModal('individual'))}
                onMouseEnter={onOrder ? undefined : preloadInquiryModal}
                onFocus={onOrder ? undefined : preloadInquiryModal}
                className={
                  orderLabel
                    ? 'inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] text-ivory min-[390px]:gap-2.5 min-[390px]:text-[14.5px]'
                    : 'inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] text-ivory min-[390px]:gap-2.5 min-[390px]:text-[14.5px]'
                }
              >
                {orderLabel ? (
                  // Phones: "Get yours" keeps it on one line beside the chevrons.
                  <>
                    <span className="sm:hidden">Get yours</span>
                    <span className="hidden sm:inline">{orderLabel}</span>
                  </>
                ) : (
                  'Order Your LuxeCard'
                )}{' '}
                <span className="font-inter">→</span>
              </button>
              {/* With a single card there's nothing to switch to; the
                  buttons keep their space so the card's layout is the same. */}
              <div className={`flex items-center gap-2${items.length < 2 ? ' invisible' : ''}`}>
                <button type="button" onClick={goToPrev} aria-label="Previous card" className={NAV_BUTTON_CLASS}>
                  <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button type="button" onClick={goToNext} aria-label="Next card" className={NAV_BUTTON_CLASS}>
                  <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Every card's line is laid out in the same spot (all but the
              current one invisible), so the space is always that of the
              longest and nothing below moves when the card changes. */}
          <div className="-mt-8 grid max-w-[300px] min-[900px]:hidden">
            {items.map((f) => (
              <p
                key={f.name}
                aria-hidden={f !== finish}
                className={`m-0 text-[14.5px] leading-[1.5] text-accent [grid-area:1/1] ${f === finish ? '' : 'invisible'}`}
                style={f === finish ? cardStyle : undefined}
              >
                {f.blurb}
              </p>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
