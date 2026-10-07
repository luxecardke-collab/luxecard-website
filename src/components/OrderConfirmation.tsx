import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, Loader2 } from 'lucide-react';
import { LINKS } from '../data/links';
import { PRODUCTION_NOTE } from '../data/production';
import { clearCartItems } from '../utils/cartStorage';
import { trackMetaPurchase } from '../utils/metaPixel';

type ConfirmationState = 'checking' | 'paid' | 'unconfirmed';

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

function getReferenceFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('reference') ?? params.get('trxref');
}

function ReferenceChip({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    try {
      navigator.clipboard?.writeText(reference).catch(() => {});
    } catch {
      // Clipboard API unavailable or blocked; the UI feedback still shows regardless.
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <span className="font-inter text-[10px] font-medium tracking-[.14em] text-grey-1">PAYMENT REFERENCE</span>
      <button
        type="button"
        onClick={handleCopy}
        className="group flex items-center gap-3 rounded-full border px-5 py-3 transition-colors duration-300"
        style={{ borderColor: copied ? '#FDD303' : 'rgba(255,255,255,.14)', background: '#101013' }}
      >
        <span className="whitespace-nowrap font-inter text-[13.5px] text-[rgba(243,240,234,.75)]">{reference}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[rgba(243,240,234,.5)] transition-colors duration-300 group-hover:text-ivory">
          {copied ? (
            <Check size={14} strokeWidth={2.2} className="text-accent" aria-hidden="true" />
          ) : (
            <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
      </button>
    </div>
  );
}

// Reached via Paystack's callback_url after checkout. The webhook (server to
// server) is the source of truth for actually recording the order, but it
// can land slightly after this redirect — so this page polls a small
// status endpoint rather than assuming success just from being loaded.
export function OrderConfirmation() {
  const [reference] = useState(getReferenceFromUrl);
  const [state, setState] = useState<ConfirmationState>(reference ? 'checking' : 'unconfirmed');

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;

    const poll = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const res = await fetch(`/api/order-status?reference=${encodeURIComponent(reference)}`);
          const data = await res.json();
          if (data?.paid) {
            if (!cancelled) {
              clearCartItems();
              setState('paid');
              // Only now that payment is confirmed. No-op without cookie consent.
              if (typeof data.value === 'number') trackMetaPurchase(reference, data.value, Array.isArray(data.contents) ? data.contents : []);
            }
            return;
          }
        } catch {
          // ignore and retry
        }
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
      if (!cancelled) setState('unconfirmed');
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (state === 'checking') {
    return (
      <main className="flex min-h-[100vh] flex-col items-center justify-center px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] text-center">
        <Loader2 size={28} strokeWidth={1.8} className="animate-spin text-accent" aria-hidden="true" />
        <p className="m-0 mt-6 text-[15.5px] leading-[1.6] text-[rgba(243,240,234,.6)]">
          Confirming your payment…
        </p>
      </main>
    );
  }

  if (state === 'unconfirmed') {
    const whatsappMessage = reference
      ? `Hi, I was charged for a LuxeCard order but didn't get a confirmation. My payment reference is: ${reference}`
      : "Hi, I was charged for a LuxeCard order but didn't get a confirmation.";
    const whatsappHref = `https://wa.me/${LINKS.WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

    return (
      <main className="flex min-h-[100vh] flex-col items-center justify-center px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)' }}
        >
          <Clock size={28} strokeWidth={1.8} className="text-[#F5A623]" aria-hidden="true" />
        </div>
        <h1 className="m-0 mt-8 font-manrope text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.05] tracking-[-.03em]">
          Payment not confirmed yet
        </h1>
        <p className="m-0 mt-4 max-w-[440px] text-[15.5px] leading-[1.6] text-[rgba(243,240,234,.6)]">
          {reference
            ? "Already charged? Don't pay again. Message us with this reference."
            : "Already charged? Don't pay again. Message us on WhatsApp."}
        </p>

        {reference && <ReferenceChip reference={reference} />}

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
        >
          Contact us on WhatsApp
        </a>
        <a
          href="/?checkout=cancelled"
          className="mt-4 text-[13.5px] text-[rgba(243,240,234,.5)] underline-offset-2 hover:text-ivory hover:underline"
        >
          Not charged? Return to your cart
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100vh] flex-col items-center justify-center px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(253,211,3,.1)', border: '1px solid rgba(253,211,3,.3)' }}
      >
        <CheckCircle2 size={28} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
      </div>
      <h1 className="m-0 mt-8 font-manrope text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.05] tracking-[-.03em]">
        Thank you! Your order is confirmed.
      </h1>
      <p className="m-0 mt-4 max-w-[440px] text-[15.5px] leading-[1.6] text-[rgba(243,240,234,.6)]">
        We'll reach out within 24 hours to discuss your card design. {PRODUCTION_NOTE}
      </p>
      <a
        href="/"
        className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
      >
        Back to Home
      </a>
    </main>
  );
}
