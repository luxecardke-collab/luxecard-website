import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { activeOffer, FINISH_PRICES_BY_LABEL, OFFERS, offerUnitPrice, productId } from '../../api/_lib/pricing';
import { cardPageFaqs, HERO_IMAGE_SIZES, headlineParts, type CardFinishChoice, type CardPage } from '../data/cardPages';
import { PHOTOS_BY_MATERIAL } from '../data/content';
import { useOffer } from '../hooks/useOffer';
import { hasAdConsent, onConsentChange } from '../utils/consent';
import { formatKes } from '../utils/formatPrice';
import { trackMetaEventWithServer } from '../utils/metaPixel';
import { scrollToSection } from '../utils/scrollToSection';
import { serverNow, subscribeServerClock } from '../utils/serverClock';
import { cardPageWhatsAppSource } from '../utils/whatsapp';
import { CardOrderForm } from './CardOrderForm';
import { FinishSwatches, Headline } from './CardPageParts';
import { Ecosystem } from './Ecosystem';
import { Faq } from './Faq';
import { FinalCta, FinalCtaGlow } from './FinalCta';
import { ForBusiness } from './ForBusiness';
import { HowItWorks } from './HowItWorks';
import { OfferBadge, OfferPrice } from './OfferPrice';
import { Professionals } from './Professionals';
import { RevealSection } from './RevealSection';
import { Testimonials } from './Testimonials';
import { VCardShowcase } from './VCardShowcase';

// A card's landing page (/wood, …), for ads. It's the homepage's own
// sections in the homepage's order, with this card's content (from
// src/data/cardPages.ts): hero, reviews, the card ("Crafted to Impress"),
// how it works, real cards (the portfolio), what you get (the homepage's
// light section), then the page's own order form, the FAQ and the closing
// call to action. Ordering happens on the page itself (#order), straight to
// checkout without the cart.

function scrollToOrder() {
  const form = document.getElementById('order');
  if (form) scrollToSection(form);
}

// A portfolio photo's file name ("wood-03") from its caption ("WOOD 03").
const photoFile = (caption: string) => caption.toLowerCase().replace(' ', '-');

export function CardLandingPage({ card }: { card: CardPage }) {
  const [finish, setFinish] = useRememberedFinish(card);
  useViewContent(card);
  const gallery = card.gallery;
  const photos = gallery
    ? PHOTOS_BY_MATERIAL[gallery.material]
        .filter((p) => !gallery.exclude?.includes(photoFile(p.caption)))
        // Described as this page's card.
        .map((p, i) => ({ ...p, alt: `LuxeCard ${card.name}, portfolio example ${i + 1}` }))
    : [];

  return (
    <main className="pt-[var(--nav-h)]">
      <CardHero card={card} finish={finish} onFinish={setFinish} />
      {/* The homepage's reviews, exactly as there. */}
      <Testimonials />
      <Ecosystem
        id="card"
        heading={<Headline text={card.showcase.headline} />}
        label={card.showcase.label}
        items={card.showcase.items}
        onOrder={scrollToOrder}
        orderLabel={card.showcaseCta}
        trackViewContent={false}
      />
      {card.presentation && <Presentation presentation={card.presentation} />}
      <HowItWorks
        heading={
          <>
            TAP. <span className="text-accent">CONNECT.</span>
            <br />
            DONE.
          </>
        }
      />
      <VCardShowcase />
      {photos.length > 0 && (
        <Professionals
          heading={
            <>
              MADE FOR BRANDS
              <br />
              ACROSS KENYA.
            </>
          }
          cardPhotos={photos}
        />
      )}
      <ForBusiness
        id="what-you-get"
        eyebrow="WHAT YOU GET"
        // Plain (no gold) on the light background, as on the homepage.
        heading={headlineParts(card.whatYouGet.headline).map((part) => part.text).join('')}
        intro={<PriceOnLight card={card} />}
        button={{ label: card.cta, onClick: scrollToOrder }}
        showWhatsApp={false}
        benefits={card.whatYouGet.points}
      />
      <CardOrderForm card={card} finish={finish} onFinish={setFinish} />
      <Faq faqs={cardPageFaqs(card)} />
      <FinalCta
        heading={<FinalHeading text="MAKE YOUR NEXT INTRODUCTION [COUNT.]" />}
        buttonLabel={`${card.cta} →`}
        onButtonClick={scrollToOrder}
        whatsappSource={cardPageWhatsAppSource(card, 'talk-to-us')}
      />
      <StickyOrderBar card={card} />
    </main>
  );
}

// A card's presentation (the Chairman's Card's box): heading and one line
// beside the floating photo, in the homepage sections' style.
function Presentation({ presentation }: { presentation: NonNullable<CardPage['presentation']> }) {
  return (
    <RevealSection
      id="presentation"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-[clamp(44px,6vw,80px)] min-[900px]:grid-cols-2">
        <div>
          <h2 className="m-0 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]">
            <Headline text={presentation.headline} />
          </h2>
          <p className="m-0 mt-6 max-w-[440px] text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.52)]">{presentation.line}</p>
        </div>
        <div className="relative mx-auto w-full max-w-[385px]">
          {/* The soft gold glow behind it, as in the hero. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(closest-side, rgba(253,211,3,.12), rgba(253,211,3,.03) 60%, transparent)' }}
          />
          <img
            src={presentation.image}
            alt={presentation.alt}
            width={presentation.width}
            height={presentation.height}
            loading="lazy"
            decoding="async"
            className="animate-lc-float relative h-auto w-full"
            style={{ filter: 'drop-shadow(0 40px 50px rgba(0,0,0,.6))' }}
          />
        </div>
      </div>
    </RevealSection>
  );
}

// "One card, KES 9,000. A one-off payment …" for the light section, with the
// offer price (struck-through regular price in a dark grey that reads on it).
function PriceOnLight({ card }: { card: CardPage }) {
  const offer = useOffer();
  const price = FINISH_PRICES_BY_LABEL[card.priceLabel];
  return (
    <>
      One card,{' '}
      {offer && (
        <>
          <span className="sr-only">was </span>
          <s className="whitespace-nowrap text-[rgba(11,11,13,.4)]">{formatKes(price)}</s>
          <span className="sr-only">, now</span>{' '}
        </>
      )}
      <span className="whitespace-nowrap font-semibold text-ink">{formatKes(offerUnitPrice(price, offer))}</span>
      {offer && ` during ${offer.name}`}. A one-off payment, with no monthly or yearly fees.
    </>
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

// The finish picked on this page, kept for the visit (sessionStorage), so a
// visitor coming back from a cancelled checkout still has it selected. The
// prerendered page starts on the first finish; a remembered one is applied
// once the page is running.
function useRememberedFinish(card: CardPage) {
  const key = `luxecard_card_finish_${card.slug}`;
  const [finish, setFinishState] = useState(card.finishes?.[0]?.label ?? null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved && card.finishes?.some((f) => f.label === saved)) setFinishState(saved);
    } catch {
      // storage unavailable: keep the default
    }
  }, [card, key]);
  const setFinish = (next: string) => {
    setFinishState(next);
    try {
      sessionStorage.setItem(key, next);
    } catch {
      // storage unavailable: the choice still applies on this page
    }
  };
  return [finish, setFinish] as const;
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
function FinishImage({
  choice,
  eager,
  sizes,
  className = '',
}: {
  choice: CardFinishChoice;
  eager?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <img
      src={choice.image}
      srcSet={choice.srcSet}
      sizes={choice.srcSet ? sizes : undefined}
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

// Whether the server's time is known yet (false in the prerendered page and
// while hydrating it).
function useServerClockKnown(): boolean {
  return useSyncExternalStore(subscribeServerClock, () => serverNow() !== null, () => false);
}

function CardPrice({ card, className = '' }: { card: CardPage; className?: string }) {
  const offer = useOffer();
  const clockKnown = useServerClockKnown();
  const price = FINISH_PRICES_BY_LABEL[card.priceLabel];
  const priceClass = 'font-inter text-[clamp(18px,1.8vw,22px)] font-semibold tracking-[.01em] text-accent';
  return (
    <div
      // offer-reserve: on phones, room for the offer badge while an offer
      // is on (see src/seo/offerSpace.ts and index.css).
      className={`offer-reserve flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}
    >
      {clockKnown ? (
        <>
          <span className={priceClass}>
            <OfferPrice price={price} offer={offer} />
          </span>
          {offer && <OfferBadge offer={offer} showEnd />}
        </>
      ) : (
        // Until the server's time is known: the regular price and each
        // offer's version are all in the page, and the head script (by the
        // visitor's clock) shows the one that applies from the first paint.
        // The server's clock then confirms it, or corrects it.
        <>
          <span className={`offer-price-regular ${priceClass}`}>
            <OfferPrice price={price} offer={null} />
          </span>
          {OFFERS.map((o) => (
            <span key={o.id} className="offer-price-variant contents" data-offer={o.id}>
              <span className={priceClass}>
                <OfferPrice price={price} offer={o} />
              </span>
              <OfferBadge offer={o} showEnd />
            </span>
          ))}
        </>
      )}
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
  // The text rises in like the homepage hero's (useMountReveal), but in CSS
  // from the first paint: on phones the heading is the page's largest
  // paint, and waiting for JavaScript to start the fade held it back.
  const choices = card.finishes ?? (card.image ? [card.image] : []);

  return (
    <section
      id="top"
      // From 900px: the homepage hero's own top spacing.
      className="relative overflow-hidden px-[clamp(20px,4vw,48px)] pb-[clamp(64px,9vh,120px)] pt-[clamp(28px,calc(12vh-60px),84px)] min-[900px]:pt-[clamp(24px,calc(15vh-80px),84px)]"
      style={{ background: 'radial-gradient(120% 90% at 78% 10%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
    >
      <div
        // From 1024px: begins where the homepage hero's text begins
        // (card-hero-offset in index.css), with its height set by its text.
        className="card-hero-offset relative z-[1] mx-auto grid max-w-[1320px] items-center gap-[clamp(40px,6vw,80px)] min-[900px]:min-h-[clamp(480px,62vh,650px)] min-[1024px]:min-h-0"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}
      >
        <div className="animate-hero-rise">
          {/* From 900px: exactly the homepage hero heading's size (.hero-title)
              and line height. */}
          <h1 className="m-0 mb-6 min-[1024px]:mb-7 font-manrope text-[clamp(40px,6.2vw,84px)] font-extrabold leading-[.98] max-md:leading-[1.04] tracking-[-0.035em] text-balance min-[900px]:text-[length:min(78px,calc((100vw_-_2*clamp(20px,4vw,48px)_-_clamp(48px,6vw,80px))/16.2))] min-[900px]:leading-[.96]">
            <Headline text={card.hero.headline} />
          </h1>
          <p className="m-0 mb-8 max-w-[480px] text-[clamp(16px,1.35vw,19px)] leading-[1.5] text-[rgba(243,240,234,.6)] text-pretty min-[1024px]:mb-10 min-[1024px]:max-w-[460px] min-[1024px]:leading-[1.55]">
            {card.hero.subtext}
          </p>
          <FinishSwatches card={card} finish={finish} onFinish={onFinish} label="Choose your finish" />
          <CardPrice card={card} className="mt-7" />
          <PrimaryButton onClick={scrollToOrder} className="mt-7">
            {card.cta} <span className="font-inter">→</span>
          </PrimaryButton>
        </div>

        {/* Desktop only (phones go straight from the text to the reviews);
            smaller, and centred beside the text. */}
        <div className="card-hero-visual relative hidden self-center min-[900px]:block">
          {/* A soft gold glow behind the card, like the homepage hero's. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(closest-side, rgba(253,211,3,.16), rgba(253,211,3,.04) 60%, transparent)' }}
          />
          {/* It floats like the cards in the homepage's "Crafted to Impress"
              (no motion with reduced motion). */}
          <div className="animate-lc-float relative mx-auto aspect-[960/550] w-full max-w-[460px] min-[1024px]:max-w-[380px]">
            {choices.map((choice, i) => (
              <FinishImage
                key={choice.label}
                choice={choice}
                // Lazy, so phones (where it's hidden) never fetch it; on
                // desktop the first finish is preloaded from <head>.
                eager={false}
                sizes={HERO_IMAGE_SIZES}
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
