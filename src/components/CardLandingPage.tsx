import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { activeOffer, FINISH_PRICES_BY_LABEL, offerUnitPrice, productId } from '../../api/_lib/pricing';
import { BULK_LINE, cardPageFaqs, headlineParts, type CardFinishChoice, type CardPage } from '../data/cardPages';
import { FinishSwatches, Headline } from './CardPageParts';
import { CUSTOMER_COUNT, PHOTOS_BY_MATERIAL, TESTIMONIALS } from '../data/content';
import { useMountReveal } from '../hooks/useMountReveal';
import { useOffer } from '../hooks/useOffer';
import { hasAdConsent, onConsentChange } from '../utils/consent';
import { formatKes } from '../utils/formatPrice';
import { trackMetaEventWithServer } from '../utils/metaPixel';
import { scrollToSection } from '../utils/scrollToSection';
import { serverNow } from '../utils/serverClock';
import { cardPageWhatsAppSource } from '../utils/whatsapp';
import { CardOrderForm } from './CardOrderForm';
import { FaqAccordion } from './FaqAccordion';
import { FinalCta, FinalCtaGlow } from './FinalCta';
import { HowItWorks } from './HowItWorks';
import { OfferBadge, OfferPrice } from './OfferPrice';
import { RevealSection } from './RevealSection';
import { TestimonialCard } from './Testimonials';

// A card's landing page (/wood, …), for ads: everything on it is about that
// one card, built from its entry in src/data/cardPages.ts and the site's
// shared data and sections. Ordering happens on the page itself (#order),
// straight to checkout without the cart.

const SECTION = 'scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]';
const EYEBROW = 'mb-4 font-inter text-[10.5px] font-medium tracking-[.15em] text-accent';
const H2 = 'm-0 font-manrope text-[clamp(32px,4.4vw,58px)] font-bold leading-[.98] max-md:leading-[1.06] tracking-[-.032em] text-balance';
const LEAD = 'm-0 text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.55)]';

function scrollToOrder() {
  const form = document.getElementById('order');
  if (form) scrollToSection(form);
}

export function CardLandingPage({ card }: { card: CardPage }) {
  const [finish, setFinish] = useState(card.finishes?.[0]?.label ?? null);
  useViewContent(card);

  return (
    <main className="pt-[var(--nav-h)]">
      <CardHero card={card} finish={finish} onFinish={setFinish} />
      <WhySection card={card} />
      <HowItWorks
        heading={<Headline text={card.how.headline} />}
        intro="Four simple steps to a more powerful connection."
        note="Can’t tap? Every card has a QR code that opens the same profile."
      />
      <WhatYouGet card={card} />
      <Gallery card={card} />
      <WhoItsFor card={card} />
      <RevealSection id="faqs" className={SECTION}>
        <div className="mx-auto max-w-[1000px]">
          <h2 className={`${H2} mb-[clamp(36px,5vh,60px)]`}>
            QUESTIONS,
            <br />
            ANSWERED.
          </h2>
          <FaqAccordion faqs={cardPageFaqs(card)} />
        </div>
      </RevealSection>
      <CardOrderForm card={card} finish={finish} onFinish={setFinish} />
      <FinalCta
        heading={<FinalHeading text={card.finalCta.headline} />}
        buttonLabel={`${card.cta} →`}
        onButtonClick={scrollToOrder}
        whatsappSource={cardPageWhatsAppSource(card, 'talk-to-us')}
      />
      <StickyOrderBar card={card} />
    </main>
  );
}

// The final call to action's heading, with its gold part glowing.
function FinalHeading({ text }: { text: string }) {
  return (
    <>
      {headlineParts(text).map((part, i) => (part.gold ? <FinalCtaGlow key={i} text={part.text} /> : part.text))}
    </>
  );
}

// Meta ViewContent for this card, once per page view: on load, or when the
// visitor accepts cookies later on this page. No-op without consent.
function useViewContent(card: CardPage) {
  useEffect(() => {
    let sent = false;
    const send = () => {
      if (sent) return;
      const price = offerUnitPrice(FINISH_PRICES_BY_LABEL[card.priceLabel], activeOffer(serverNow()));
      const id = productId(card.priceLabel);
      trackMetaEventWithServer('ViewContent', {
        content_type: 'product',
        content_name: card.priceLabel,
        content_ids: [id],
        contents: [{ id, quantity: 1, item_price: price }],
        value: price,
        currency: 'KES',
      });
      // It did nothing without consent; then it's sent once they accept.
      sent = hasAdConsent();
    };
    send();
    return onConsentChange((choice) => {
      if (choice === 'accepted') send();
    });
  }, [card]);
}

// The card photo for a finish: a cut-out card floats on the glow; a photo
// with its own background is cropped to the card's shape.
function FinishImage({ choice, eager, className = '' }: { choice: CardFinishChoice; eager?: boolean; className?: string }) {
  return (
    <img
      src={choice.image}
      alt={choice.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${
        choice.fit === 'cover' ? 'rounded-[clamp(12px,2vw,22px)] object-cover' : 'object-contain'
      } ${className}`}
      style={{
        objectPosition: choice.objectPosition,
        boxShadow: choice.fit === 'cover' ? '0 50px 90px -40px rgba(0,0,0,.95)' : undefined,
        filter: choice.fit === 'contain' ? 'drop-shadow(0 40px 50px rgba(0,0,0,.6))' : undefined,
      }}
    />
  );
}

function CardPrice({ card, className = '' }: { card: CardPage; className?: string }) {
  const offer = useOffer();
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="font-inter text-[clamp(18px,1.8vw,22px)] font-semibold tracking-[.01em] text-accent">
        <OfferPrice price={FINISH_PRICES_BY_LABEL[card.priceLabel]} offer={offer} />
      </span>
      {offer && <OfferBadge offer={offer} showEnd />}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2.5 rounded-full bg-ivory px-[clamp(20px,5vw,30px)] py-[clamp(14px,3.5vw,17px)] text-[clamp(14px,3.4vw,15.5px)] font-semibold text-bg transition-[transform,box-shadow] duration-[.4s] ease-lux hover:-translate-y-[3px] ${className}`}
      style={{ boxShadow: '0 18px 44px -22px rgba(243,240,234,.6)' }}
    >
      {children}
    </button>
  );
}

function CardHero({ card, finish, onFinish }: { card: CardPage; finish: string | null; onFinish: (f: string) => void }) {
  const textStyle = useMountReveal(80);
  const visualStyle = useMountReveal(280);
  const choices = card.finishes ?? (card.image ? [card.image] : []);

  return (
    <section
      id="top"
      className="relative overflow-hidden px-[clamp(20px,4vw,48px)] pb-[clamp(64px,9vh,120px)] pt-[clamp(28px,calc(12vh-60px),84px)]"
      style={{ background: 'radial-gradient(120% 90% at 78% 10%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
    >
      <div
        className="relative z-[1] mx-auto grid max-w-[1320px] items-center gap-[clamp(40px,6vw,80px)] min-[900px]:min-h-[clamp(480px,62vh,650px)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}
      >
        <div style={textStyle}>
          <div className={EYEBROW}>{card.hero.eyebrow}</div>
          <h1 className="m-0 mb-6 font-manrope text-[clamp(40px,6.2vw,84px)] font-extrabold leading-[.98] max-md:leading-[1.04] tracking-[-0.035em] text-balance">
            <Headline text={card.hero.headline} />
          </h1>
          <p className="m-0 mb-8 max-w-[480px] text-[clamp(16px,1.35vw,19px)] leading-[1.5] text-[rgba(243,240,234,.6)] text-pretty">
            {card.hero.subtext}
          </p>
          <FinishSwatches card={card} finish={finish} onFinish={onFinish} label="Choose your finish" />
          {card.finishNote && <p className="m-0 text-[14.5px] text-[rgba(243,240,234,.6)]">{card.finishNote}</p>}
          <CardPrice card={card} className="mt-7" />
          <PrimaryButton onClick={scrollToOrder} className="mt-7">
            {card.cta} <span className="font-inter">→</span>
          </PrimaryButton>
          <p className="m-0 mt-7 font-inter text-[11px] font-medium uppercase tracking-[.14em] text-grey-1">
            Trusted by {CUSTOMER_COUNT}+ professionals across Kenya
          </p>
        </div>

        <div style={visualStyle} className="relative">
          {/* A soft gold glow behind the card, like the homepage hero's. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(closest-side, rgba(253,211,3,.16), rgba(253,211,3,.04) 60%, transparent)' }}
          />
          <div className="relative mx-auto aspect-[960/550] w-full max-w-[620px]">
            {choices.map((choice, i) => (
              <FinishImage
                key={choice.label}
                choice={choice}
                // The first finish is preloaded from <head>; the others are
                // fetched lazily (they're on screen, so straight away).
                eager={i === 0}
                className={`transition-opacity duration-500 ${
                  (finish ? choice.label === finish : i === 0) ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-base))' }}
      />
    </section>
  );
}

function WhySection({ card }: { card: CardPage }) {
  return (
    <RevealSection id="why" className={SECTION}>
      <div className="mx-auto grid max-w-[1320px] items-center gap-[clamp(44px,6vw,90px)] min-[900px]:grid-cols-2">
        <div>
          <div className={EYEBROW}>{card.why.eyebrow}</div>
          <h2 className={H2}>
            <Headline text={card.why.headline} />
          </h2>
          <p className={`${LEAD} mt-7 max-w-[520px]`}>{card.why.body}</p>
          <ul className="m-0 mt-8 flex list-none flex-col gap-4 p-0">
            {card.why.points.map((point) => (
              <li key={point.title} className="flex items-start gap-3.5">
                <Check size={18} strokeWidth={2} className="mt-[3px] shrink-0 text-accent" aria-hidden="true" />
                <span className="text-[16px] leading-[1.55] text-[rgba(243,240,234,.75)]">
                  <span className="font-semibold text-ivory">{point.title}:</span> {point.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {card.finishes && (
          <div className="grid grid-cols-2 gap-[clamp(14px,2vw,24px)]">
            {card.finishes.map((choice) => (
              <figure key={choice.label} className="m-0">
                <div
                  className="relative aspect-[960/550] rounded-2xl border border-[rgba(255,255,255,.06)] p-[8%]"
                  style={{ background: 'radial-gradient(110% 80% at 50% 20%, #17171B, #0B0B0D 70%)' }}
                >
                  <div className="relative h-full w-full">
                    <FinishImage choice={choice} />
                  </div>
                </div>
                <figcaption className="mt-3 text-center font-inter text-[11px] font-medium uppercase tracking-[.14em] text-grey-1">
                  {choice.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </RevealSection>
  );
}

function WhatYouGet({ card }: { card: CardPage }) {
  return (
    <RevealSection id="what-you-get" className={SECTION}>
      <div className="mx-auto grid max-w-[1320px] items-start gap-[clamp(44px,6vw,90px)] min-[900px]:grid-cols-[1.2fr_1fr]">
        <div>
          <div className={EYEBROW}>WHAT YOU GET</div>
          <h2 className={H2}>
            <Headline text={card.whatYouGet.headline} />
          </h2>
          <ul className="m-0 mt-9 flex list-none flex-col gap-4 p-0">
            {card.whatYouGet.items.map((item) => (
              <li key={item} className="flex items-start gap-3.5">
                <Check size={18} strokeWidth={2} className="mt-[3px] shrink-0 text-accent" aria-hidden="true" />
                <span className="text-[16px] leading-[1.55] text-[rgba(243,240,234,.75)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-[20px] border border-[rgba(255,255,255,.08)] p-[clamp(26px,3vw,40px)]"
          style={{ background: 'radial-gradient(110% 80% at 70% 20%, #17171B, #0B0B0D 65%)' }}
        >
          <div className="font-inter text-[11px] font-medium tracking-[.14em] text-grey-1">ONE CARD</div>
          <CardPrice card={card} className="mt-3" />
          <p className="m-0 mt-5 text-[15px] leading-[1.55] text-[rgba(243,240,234,.7)]">{BULK_LINE}</p>
          <OfferBulkNote />
          <p className="m-0 mt-2 text-[15px] leading-[1.55] text-[rgba(243,240,234,.7)]">No monthly or yearly fees.</p>
          <PrimaryButton onClick={scrollToOrder} className="mt-8">
            {card.cta} <span className="font-inter">→</span>
          </PrimaryButton>
        </div>
      </div>
    </RevealSection>
  );
}

// While an offer runs it takes the bulk discount's place (they never
// combine), as checkout charges.
function OfferBulkNote() {
  const offer = useOffer();
  if (!offer) return null;
  return (
    <p className="m-0 mt-2 text-[13.5px] leading-[1.5] text-[rgba(253,211,3,.8)]">
      During {offer.name}, the offer replaces the bulk discount rather than adding to it.
    </p>
  );
}

const GALLERY_PREVIEW = 8;

function Gallery({ card }: { card: CardPage }) {
  const photos = PHOTOS_BY_MATERIAL[card.gallery.material];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? photos : photos.slice(0, GALLERY_PREVIEW);
  const testimonials = card.testimonials
    .map((name) => TESTIMONIALS.find((t) => t.name === name))
    .filter((t) => t !== undefined);

  return (
    <RevealSection id="gallery" className={SECTION}>
      <div className="mx-auto max-w-[1320px]">
        <div className={EYEBROW}>REAL CARDS, REAL CLIENTS</div>
        <h2 className={H2}>
          <Headline text={card.gallery.headline} />
        </h2>
        <div className="mt-[clamp(36px,5vh,56px)] grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {shown.map((photo) => {
            // Keyed by the photo's file name, e.g. "wood-03".
            const label = card.gallery.labels?.[photo.caption.toLowerCase().replace(' ', '-')];
            return (
              <figure key={photo.image} className="relative m-0 overflow-hidden rounded-2xl border border-[rgba(255,255,255,.06)]">
                <img
                  src={photo.image}
                  alt={photo.alt}
                  width={800}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square h-auto w-full object-cover"
                />
                {label && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,.75)] to-transparent px-3 pb-3 pt-8 text-[12.5px] text-ivory">
                    {label}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
        {!showAll && photos.length > GALLERY_PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-6 rounded-full border border-[rgba(255,255,255,.14)] px-5 py-2.5 text-[14px] font-medium text-[rgba(243,240,234,.78)] transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            See all {photos.length}
          </button>
        )}

        {testimonials.length > 0 && (
          <div className="mt-[clamp(56px,8vh,96px)] flex flex-wrap justify-center gap-4 sm:gap-5">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        )}
      </div>
    </RevealSection>
  );
}

function WhoItsFor({ card }: { card: CardPage }) {
  return (
    <RevealSection id="who-its-for" className={SECTION}>
      <div className="mx-auto max-w-[1000px] text-center">
        <h2 className={H2}>
          <Headline text={card.whoFor.headline} />
        </h2>
        <ul className="m-0 mt-[clamp(32px,5vh,48px)] flex list-none flex-wrap justify-center gap-2.5 p-0">
          {card.whoFor.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-[rgba(255,255,255,.12)] px-4 py-2 font-inter text-[12px] font-medium uppercase tracking-[.12em] text-[rgba(243,240,234,.75)]"
            >
              {tag}
            </li>
          ))}
        </ul>
        <p className={`${LEAD} mx-auto mt-8 max-w-[520px]`}>{card.whoFor.line}</p>
      </div>
    </RevealSection>
  );
}

// Phones only: "Get my Wood LuxeCard · KES …" pinned to the bottom once the
// hero has scrolled away, while the order form is still further down.
function StickyOrderBar({ card }: { card: CardPage }) {
  const offer = useOffer();
  const [heroPassed, setHeroPassed] = useState(false);
  const [formBelow, setFormBelow] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const visible = heroPassed && formBelow;

  useEffect(() => {
    const hero = document.getElementById('top');
    const form = document.getElementById('order');
    const heroIo = new IntersectionObserver(([e]) => setHeroPassed(!e.isIntersecting && e.boundingClientRect.top < 0));
    const formIo = new IntersectionObserver(([e]) => setFormBelow(!e.isIntersecting && e.boundingClientRect.top > 0));
    if (hero) heroIo.observe(hero);
    if (form) formIo.observe(form);
    return () => {
      heroIo.disconnect();
      formIo.disconnect();
    };
  }, []);

  // Lifts the floating WhatsApp button above the bar while it shows.
  useEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (visible && bar && window.matchMedia('(max-width: 767px)').matches) {
      root.style.setProperty('--order-bar-h', `${bar.offsetHeight}px`);
    } else {
      root.style.removeProperty('--order-bar-h');
    }
    return () => {
      root.style.removeProperty('--order-bar-h');
    };
  }, [visible]);

  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      inert={!visible}
      className="fixed inset-x-0 bottom-[var(--cookie-banner-h,0px)] z-[140] border-t border-[rgba(255,255,255,.08)] px-4 py-3 transition-[opacity,transform] duration-300 ease-lux md:hidden"
      style={{
        background: 'rgba(8,8,10,.92)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <button
        type="button"
        onClick={scrollToOrder}
        className="w-full rounded-full bg-ivory px-5 py-[14px] text-[15px] font-semibold text-ink"
      >
        {card.cta} · {formatKes(offerUnitPrice(FINISH_PRICES_BY_LABEL[card.priceLabel], offer))}
      </button>
    </div>
  );
}
