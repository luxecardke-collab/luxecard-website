import { useMemo, useState } from 'react';
import { CARD_FINISHES } from '../data/content';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useMountReveal } from '../hooks/useMountReveal';
import { useParallax } from '../hooks/useParallax';
import { FINISH_PRICES_BY_LABEL, offerUnitPrice } from '../../api/_lib/pricing';
import { useOffer } from '../hooks/useOffer';
import { formatKes } from '../utils/formatPrice';
import { OfferPrice } from './OfferPrice';
import { LiquidMetalButton } from './LiquidMetalButton';
import { ShaderAnimation } from './ShaderAnimation';

const FINISH_OPTIONS = CARD_FINISHES.map((f) => ({ name: f.name, price: FINISH_PRICES_BY_LABEL[f.priceLabel] }));
const COMMISSION_RATE = 0.1;
const MIN_CARDS = 1;
const MAX_CARDS = 20;
const DEFAULT_CARDS = 6;
const DEFAULT_FINISH_INDEX = 1; // Plastic

export function AffiliateHero() {
  const textStyle = useMountReveal(80);
  const calcStyle = useMountReveal(280);
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [finishIndex, setFinishIndex] = useState(DEFAULT_FINISH_INDEX);

  const finish = FINISH_OPTIONS[finishIndex];
  // Commission is a share of what the customer actually pays, so it follows
  // any offer that's on.
  const offer = useOffer();
  const finishPrice = offerUnitPrice(finish.price, offer);
  const targetEarnings = useMemo(() => cards * finishPrice * COMMISSION_RATE, [cards, finishPrice]);
  const displayEarnings = useAnimatedNumber(targetEarnings);
  const isSettling = Math.abs(displayEarnings - targetEarnings) > 1;
  const pct = ((cards - MIN_CARDS) / (MAX_CARDS - MIN_CARDS)) * 100;
  const shaderParallaxRef = useParallax<HTMLDivElement>(0.12);

  return (
    <section
      id="top"
      className="relative overflow-hidden px-[clamp(20px,4vw,48px)] pb-[clamp(64px,9vh,120px)] pt-[clamp(36px,calc(15vh-84px),96px)] min-[900px]:pt-[clamp(24px,calc(15vh-80px),84px)]"
      style={{ background: 'radial-gradient(120% 90% at 78% 10%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
    >
      <div ref={shaderParallaxRef} className="absolute inset-x-0 -top-[20%] -bottom-[20%]">
        <ShaderAnimation />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-base))' }}
      />
      <div
        className="relative z-[1] mx-auto grid max-w-[1320px] items-center gap-[clamp(48px,6vw,80px)] min-[900px]:min-h-[clamp(480px,62vh,650px)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}
      >
        <div style={textStyle}>
          <div className="mb-5 font-inter text-[10px] font-medium tracking-[.2em] text-accent">
            AFFILIATE PROGRAM
          </div>
          <h1 className="m-0 mb-6 font-manrope text-[clamp(34px,5.4vw,64px)] font-extrabold leading-[.98] max-md:leading-[1.06] tracking-[-.035em]">
            Earn With Every <span className="text-accent">Introduction</span> You Make.
          </h1>
          <p className="m-0 mb-8 max-w-[400px] text-[clamp(16px,1.3vw,18px)] leading-[1.5] text-[rgba(243,240,234,.6)]">
            Share your link. Earn 10% on every sale.
          </p>
          <LiquidMetalButton
            href="#affiliate-signup"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#131316] px-[clamp(16px,5vw,30px)] py-[clamp(12px,3.5vw,17px)] text-[clamp(12.5px,3.2vw,15.5px)] font-semibold text-ivory transition-[transform,box-shadow] duration-[.4s] ease-lux hover:-translate-y-[3px]"
            style={{ boxShadow: '0 18px 44px -22px rgba(0,0,0,.8)' }}
          >
            Become an Affiliate
          </LiquidMetalButton>
        </div>

        <div style={calcStyle} className="mx-auto w-full max-w-[360px] min-[900px]:max-w-[440px]">
          <div
            className="rounded-[22px] border border-[rgba(255,255,255,.1)] p-[clamp(18px,2.4vw,24px)] min-[900px]:py-[clamp(16px,2vw,20px)]"
            style={{
              background: 'radial-gradient(120% 100% at 50% 0%, #17171B 0%, #0C0C0E 60%)',
              boxShadow: '0 40px 70px -35px rgba(0,0,0,.85)',
            }}
          >
            <div className="mb-3 font-inter text-[9.5px] font-medium tracking-[.14em] text-grey-1">
              EARNINGS CALCULATOR
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {FINISH_OPTIONS.map((f, i) => {
                const selected = i === finishIndex;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFinishIndex(i)}
                    aria-pressed={selected}
                    className="flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors duration-300"
                    style={{
                      borderColor: selected ? '#FDD303' : 'rgba(255,255,255,.14)',
                      background: selected ? 'rgba(253,211,3,.08)' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[12px] font-medium leading-[1.25]"
                      style={{ color: selected ? '#FDD303' : '#F3F0EA' }}
                    >
                      {f.name}
                    </span>
                    <span className="text-[10.5px] text-[rgba(243,240,234,.45)]">
                      <OfferPrice price={f.price} offer={offer} />
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min={MIN_CARDS}
              max={MAX_CARDS}
              step={1}
              value={cards}
              onChange={(e) => setCards(Number(e.target.value))}
              aria-label="Cards referred per month"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#0B0B0D] [&::-moz-range-thumb]:bg-accent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#0B0B0D] [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_4px_14px_rgba(253,211,3,.55)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 active:[&::-webkit-slider-thumb]:scale-125"
              style={{
                background: `linear-gradient(to right, #FDD303 0%, #FDD303 ${pct}%, rgba(255,255,255,.14) ${pct}%, rgba(255,255,255,.14) 100%)`,
              }}
            />

            <div className="mt-2.5 flex items-center justify-between font-inter text-[10px] tracking-[.08em] text-grey-1">
              <span>1 CARD</span>
              <span className="text-ivory">
                {cards} {cards === 1 ? 'CARD' : 'CARDS'} / MONTH
              </span>
              <span>20+ CARDS</span>
            </div>

            <div className="mt-5 border-t border-[rgba(255,255,255,.08)] pt-4 text-center min-[900px]:mt-4 min-[900px]:pt-3.5">
              <div className="font-inter text-[9.5px] font-medium tracking-[.14em] text-grey-1">
                YOUR POTENTIAL EARNINGS
              </div>
              <div
                className="mt-2 font-manrope text-[clamp(32px,3.6vw,40px)] font-extrabold leading-none tracking-[-.03em] text-accent transition-transform duration-200 ease-out"
                style={{ transform: isSettling ? 'scale(1.04)' : 'scale(1)' }}
              >
                {formatKes(displayEarnings)}
              </div>
              <div className="mt-1.5 text-[12px] text-[rgba(243,240,234,.45)]">/month at 10% commission</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
