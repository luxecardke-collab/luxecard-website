import { useEffect, useState, type ComponentType } from 'react';
import { Check, CreditCard, Link2, Mail, MessageCircle, Share2 } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { RevealSection } from './RevealSection';

const REFERRAL_LINK = 'www.luxecard.co.ke/?ref=YOURCODE';
const SHARE_CHANNELS: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>[] = [
  MessageCircle,
  Mail,
  Share2,
];

const CARD_CLASS = 'flex flex-col items-center gap-4 rounded-[22px] border border-[rgba(255,255,255,.1)] p-8 text-center';
const CARD_STYLE = {
  background: 'radial-gradient(120% 100% at 50% 0%, #17171B 0%, #0C0C0E 60%)',
  boxShadow: '0 40px 70px -35px rgba(0,0,0,.85)',
};

// Illustration only: shows the shape of a referral link, not a real one.
function LinkNode() {
  const { ref, style } = useReveal<HTMLDivElement>(0);

  return (
    <div ref={ref} style={{ ...style, ...CARD_STYLE }} className={CARD_CLASS}>
      <div className="font-inter text-[10px] font-medium tracking-[.14em] text-grey-1">GET YOUR LINK</div>
      <div
        className="flex items-center gap-3 rounded-full border px-5 py-3.5"
        style={{ borderColor: 'rgba(255,255,255,.14)', background: '#101013' }}
      >
        <Link2 size={16} strokeWidth={1.8} className="shrink-0 text-[rgba(243,240,234,.65)]" aria-hidden="true" />
        <span className="whitespace-nowrap font-inter text-[13.5px] text-[rgba(243,240,234,.75)]">
          {REFERRAL_LINK}
        </span>
      </div>
    </div>
  );
}

function ShareNode() {
  const { ref, style, visible } = useReveal<HTMLDivElement>(90);

  return (
    <div ref={ref} style={{ ...style, ...CARD_STYLE }} className={CARD_CLASS}>
      <div className="font-inter text-[10px] font-medium tracking-[.14em] text-grey-1">SHARE ANYWHERE</div>
      <div className="flex items-center gap-3">
        {SHARE_CHANNELS.map((Icon, i) => (
          <div
            key={i}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,.14)] transition-[opacity,transform] duration-500 ease-lux"
            style={{
              background: '#101013',
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(.6)',
              transitionDelay: `${i * 120}ms`,
            }}
          >
            <Icon size={18} strokeWidth={1.7} className="text-[rgba(243,240,234,.65)]" />
          </div>
        ))}
      </div>
      <p className="m-0 max-w-[180px] text-[12.5px] leading-[1.5] text-[rgba(243,240,234,.45)]">
        WhatsApp, Instagram, email: wherever your network is.
      </p>
    </div>
  );
}

function EarnNode() {
  const { ref, style, visible } = useReveal<HTMLDivElement>(180);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => setPurchased(true), 500);
    return () => clearTimeout(timeout);
  }, [visible]);

  return (
    <div ref={ref} style={{ ...style, ...CARD_STYLE }} className={CARD_CLASS}>
      <div className="font-inter text-[10px] font-medium tracking-[.14em] text-grey-1">YOU EARN</div>
      <div className="relative my-3 flex h-12 w-12 items-center justify-center">
        {purchased &&
          [0, 0.7, 1.4].map((delay) => (
            <span
              key={delay}
              className="absolute inset-0 animate-lc-ripple rounded-full border"
              style={{ borderColor: 'rgba(253,211,3,.4)', animationDelay: `${delay}s` }}
            />
          ))}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors duration-500"
          style={{
            borderColor: purchased ? 'rgba(253,211,3,.5)' : 'rgba(255,255,255,.14)',
            background: '#0C0C0F',
          }}
        >
          <CreditCard size={18} strokeWidth={1.7} className="text-[rgba(243,240,234,.65)]" aria-hidden="true" />
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full border border-[rgba(253,211,3,.35)] bg-[#101013] px-3.5 py-2 transition-[opacity,transform] duration-500 ease-lux"
        style={{
          opacity: purchased ? 1 : 0,
          transform: purchased ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '250ms',
        }}
      >
        <Check size={13} strokeWidth={2.4} className="text-accent" aria-hidden="true" />
        <span className="whitespace-nowrap text-[12.5px] font-medium text-ivory">Sale confirmed: +10%</span>
      </div>
    </div>
  );
}

export function AffiliateLinkJourney() {
  return (
    <RevealSection className="border-t border-[rgba(255,255,255,.06)] bg-bg-alt px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)]">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-[clamp(48px,7vh,80px)] text-center">
          <div className="mb-4 font-inter text-[10px] font-medium tracking-[.2em] text-accent">
            HOW SHARING WORKS
          </div>
          <h2 className="m-0 font-manrope text-[clamp(30px,4.2vw,52px)] font-bold leading-[1.05] tracking-[-.032em]">
            Your Link. Their Purchase.
            {' '}
            <br />
            Your Commission.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-3">
          <LinkNode />
          <ShareNode />
          <EarnNode />
        </div>
      </div>
    </RevealSection>
  );
}
