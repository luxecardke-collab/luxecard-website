import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { computeTotals, FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { useCart, type CustomerInfo } from '../context/cartContext';
import type { CardPage } from '../data/cardPages';
import { ETIMS_INVOICE_NOTE } from '../data/etims';
import { LINKS } from '../data/links';
import { PRODUCTION_NOTE } from '../data/production';
import { useOffer } from '../hooks/useOffer';
import { QUOTE_CONFIRMATION_MESSAGE, sendCartLead, sendQuoteRequest } from '../utils/cartLead';
import { startCheckout, trackAddToCart } from '../utils/checkout';
import { formatKes } from '../utils/formatPrice';
import { HONEYPOT_NAME, readHoneypot } from '../utils/honeypot';
import { inputClass } from '../utils/inputClass';
import {
  BUSINESS_NAME_ERROR,
  isValidKraPin,
  KRA_BUSINESS_NAME_MAX,
  KRA_PIN_ERROR,
  KRA_PIN_LENGTH,
  normalizeKraPin,
} from '../utils/kra';
import { syncServerClock } from '../utils/serverClock';
import { cardPageWhatsAppSource, whatsappLinkProps } from '../utils/whatsapp';
import { FinishSwatches, Headline } from './CardPageParts';
import { Field } from './FormField';
import { HoneypotField } from './HoneypotField';
import { OfferBadge, OfferPrice } from './OfferPrice';
import { PaymentLine } from './PaymentLine';
import { RevealSection } from './RevealSection';

// A card page's order form: this one card, straight to Paystack with no cart
// step. It saves the lead and fires AddToCart exactly as adding to the cart
// does, then goes through the same checkout as the cart (utils/checkout.ts),
// with the same fields, validation and honeypot as the site's order forms.

const AFTER_PAYMENT = [
  'We reach out within 24 hours to collect your details and design your card.',
  'You review and approve your mockup.',
  PRODUCTION_NOTE,
];

function initialForm() {
  return {
    fullName: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    quantity: 1,
    business: false,
    needsEtims: false,
    kraPin: '',
    kraBusinessName: '',
  };
}
type Form = ReturnType<typeof initialForm>;

export function CardOrderForm({
  card,
  finish,
  onFinish,
}: {
  card: CardPage;
  finish: string | null;
  onFinish: (finish: string) => void;
}) {
  const offer = useOffer();
  const { customerInfo, saveCustomerInfo } = useCart();
  const [form, setForm] = useState<Form>(initialForm);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking-out' | 'quoting' | 'quoted'>('idle');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  // After checkout reports a new price, that total is what the next attempt
  // agrees to pay (as in the cart).
  const confirmedTotal = useRef<number | null>(null);
  const honeypotFormRef = useRef<HTMLFormElement>(null);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    confirmedTotal.current = null;
  };

  // Details saved from an earlier order on this browser come back pre-filled.
  useEffect(() => {
    if (!customerInfo) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || customerInfo.name,
      company: prev.company || customerInfo.company,
      email: prev.email || customerInfo.email,
      phone: prev.phone || customerInfo.phone,
    }));
  }, [customerInfo]);

  // Back from Paystack (cancelled, or the browser's back button): the button
  // shouldn't stay stuck on "Redirecting to payment…".
  useEffect(() => {
    const onPageShow = () => setStatus('idle');
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const unitPrice = FINISH_PRICES_BY_LABEL[card.priceLabel];
  const totals = computeTotals([{ price: unitPrice, quantity: form.quantity }], offer);

  const invalid = {
    fullName: !form.fullName.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
    phone: !form.phone.trim(),
    company: form.business && !form.company.trim(),
    kraPin: form.business && form.needsEtims && !isValidKraPin(form.kraPin),
    kraBusinessName: form.business && form.needsEtims && !form.kraBusinessName.trim(),
    finish: !!card.finishes && !finish,
  };
  const valid = !Object.values(invalid).some(Boolean);

  const customer = (): CustomerInfo => ({
    name: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    company: form.company.trim(),
    ...(form.business && form.needsEtims
      ? { etims: { kraPin: normalizeKraPin(form.kraPin), businessName: form.kraBusinessName.trim() } }
      : {}),
    orderType: form.business ? 'business' : 'individual',
  });
  const items = [{ name: card.priceLabel, subOption: finish ?? undefined, quantity: form.quantity }];
  const leadPayload = (c: CustomerInfo, hp: string) => ({
    type: form.business ? ('business' as const) : ('individual' as const),
    fullName: c.name,
    jobTitle: form.title.trim(),
    company: c.company,
    email: c.email,
    phone: c.phone,
    items,
    ...(c.etims ? { needsEtims: true, kraPin: c.etims.kraPin, kraBusinessName: c.etims.businessName } : {}),
    hp,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hp = readHoneypot(e);
    setAttempted(true);
    setMessage(null);
    if (!valid || status === 'checking-out') return;

    const c = customer();
    saveCustomerInfo(c);
    // Saved first, like adding to the cart, so the lead is kept even if
    // they never pay.
    sendCartLead(leadPayload(c, hp));
    trackAddToCart({ name: card.priceLabel, price: unitPrice, quantity: form.quantity }, offer, { email: c.email, phone: c.phone });

    setStatus('checking-out');
    void syncServerClock();
    const result = await startCheckout({
      items,
      customer: c,
      total: confirmedTotal.current ?? totals.total,
      itemOffer: totals.discountType === 'offer' ? offer : null,
      returnTo: card.path,
    });
    if (result.status === 'price-changed') {
      confirmedTotal.current = result.total;
      setMessage({
        text: `Prices have changed${result.total !== null ? `: your total is now ${formatKes(result.total)}` : ''}. Press “Proceed to checkout” again to pay it.`,
        error: true,
      });
      setStatus('idle');
    } else if (result.status === 'error') {
      setMessage({ text: `Checkout failed: ${result.message}`, error: true });
      setStatus('idle');
    }
  };

  const handleQuote = async () => {
    setAttempted(true);
    setMessage(null);
    if (!valid || status === 'quoting') return;
    const hp = (honeypotFormRef.current?.elements.namedItem(HONEYPOT_NAME) as HTMLInputElement | null)?.value ?? '';
    const c = customer();
    saveCustomerInfo(c);
    setStatus('quoting');
    const ok = await sendQuoteRequest({ ...leadPayload(c, hp), quoteRequested: true });
    if (ok) {
      setStatus('quoted');
    } else {
      setStatus('idle');
      setMessage({ text: 'Could not send your quote request. Please try again in a moment.', error: true });
    }
  };

  return (
    <RevealSection
      id="order"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto grid max-w-[1120px] items-start gap-[clamp(40px,6vw,80px)] min-[900px]:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 className="m-0 font-manrope text-[clamp(32px,4.4vw,58px)] font-bold leading-[.98] max-md:leading-[1.06] tracking-[-.032em] text-balance">
            <Headline text={card.order.headline} />
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-inter text-[20px] font-semibold text-accent">
              <OfferPrice price={unitPrice} offer={offer} />
            </span>
            {offer && <OfferBadge offer={offer} showEnd />}
          </div>

          <h3 className="m-0 mt-[clamp(36px,5vh,56px)] font-inter text-[11px] font-medium uppercase tracking-[.14em] text-grey-1">
            What happens after you pay
          </h3>
          <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
            {AFTER_PAYMENT.map((step, i) => (
              <li key={step} className="flex items-start gap-4">
                <span className="mt-[2px] font-inter text-[11px] tracking-[.1em] text-accent">0{i + 1}</span>
                <span className="text-[15.5px] leading-[1.55] text-[rgba(243,240,234,.7)]">{step}</span>
              </li>
            ))}
          </ol>

          <p className="m-0 mt-[clamp(32px,5vh,48px)] text-[14.5px] leading-[1.65] text-[rgba(243,240,234,.6)]">
            Questions first?{' '}
            <a
              {...whatsappLinkProps(cardPageWhatsAppSource(card, 'order-form'))}
              className="text-accent underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-80"
            >
              Chat with us on WhatsApp
            </a>
            , call{' '}
            <a href={LINKS.PHONE_TEL} className="whitespace-nowrap text-ivory hover:text-accent">
              {LINKS.PHONE_DISPLAY}
            </a>{' '}
            or email{' '}
            <a href={LINKS.EMAIL_MAILTO} className="text-ivory hover:text-accent">
              {LINKS.EMAIL}
            </a>
            .
          </p>
        </div>

        <form
          ref={honeypotFormRef}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-[22px] border border-[rgba(255,255,255,.1)] p-[clamp(22px,3.5vw,38px)]"
          style={{ background: 'radial-gradient(120% 100% at 50% 0%, #17171B 0%, #0C0C0E 60%)' }}
        >
          <HoneypotField />

          {card.finishes ? (
            <div className="flex flex-col gap-3">
              <span className="font-inter text-[11px] font-medium tracking-[.1em] text-grey-1">
                FINISH<span className={attempted && invalid.finish ? 'text-[#F87171]' : 'text-accent'}> *</span>
              </span>
              <FinishSwatches card={card} finish={finish} onFinish={onFinish} label="Finish" />
            </div>
          ) : (
            card.finishNote && <p className="m-0 text-[14.5px] text-[rgba(243,240,234,.6)]">{card.finishNote}</p>
          )}

          <Field label="Full Name" required invalid={attempted && invalid.fullName}>
            <input
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className={inputClass(attempted && invalid.fullName)}
              placeholder="Jane Doe"
            />
          </Field>

          <div className="grid gap-5 min-[560px]:grid-cols-2">
            <Field label="Title / Role">
              <input
                type="text"
                autoComplete="organization-title"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={inputClass()}
                placeholder="Founder"
              />
            </Field>
            {!form.business && (
              <Field label="Company">
                <input
                  type="text"
                  autoComplete="organization"
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                  className={inputClass()}
                  placeholder="Acme Inc."
                />
              </Field>
            )}
          </div>

          <div className="grid gap-5 min-[560px]:grid-cols-2">
            <Field label="Phone" required invalid={attempted && invalid.phone}>
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={inputClass(attempted && invalid.phone)}
                placeholder="0712 345 678"
              />
            </Field>
            <Field label="Email" required invalid={attempted && invalid.email} errorText="Please enter a valid email address.">
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass(attempted && invalid.email)}
                placeholder="jane@acme.com"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-inter text-[11px] font-medium tracking-[.1em] text-grey-1">QUANTITY</span>
            <div className="flex w-fit shrink-0 items-center gap-1 rounded-full border border-[rgba(255,255,255,.14)] p-1">
              <button
                type="button"
                onClick={() => update('quantity', Math.max(1, form.quantity - 1))}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
              >
                <Minus size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <span className="w-8 text-center text-[15px] text-ivory" aria-live="polite">
                {form.quantity}
              </span>
              <button
                type="button"
                onClick={() => update('quantity', form.quantity + 1)}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
              >
                <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </div>

          <Checkbox checked={form.business} onChange={(v) => update('business', v)}>
            Ordering for a business?
          </Checkbox>

          {form.business && (
            <div className="flex flex-col gap-5 rounded-2xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.02)] p-4">
              <Field label="Organization Name" required invalid={attempted && invalid.company}>
                <input
                  type="text"
                  autoComplete="organization"
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                  className={inputClass(attempted && invalid.company)}
                  placeholder="Acme Inc."
                />
              </Field>
              <Checkbox checked={form.needsEtims} onChange={(v) => update('needsEtims', v)}>
                I need an eTIMS tax invoice
              </Checkbox>
              {form.needsEtims && (
                <>
                  <div className="grid gap-5 min-[560px]:grid-cols-2">
                    <Field label="KRA PIN" required invalid={attempted && invalid.kraPin} errorText={KRA_PIN_ERROR}>
                      <input
                        type="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        value={form.kraPin}
                        // No maxLength: it would cut a pasted "p051 234 567x" short
                        // before the spaces are stripped.
                        onChange={(e) => update('kraPin', normalizeKraPin(e.target.value).slice(0, KRA_PIN_LENGTH))}
                        className={`${inputClass(attempted && invalid.kraPin)} uppercase`}
                        placeholder="P051234567X"
                      />
                    </Field>
                    <Field
                      label="Registered business name"
                      required
                      invalid={attempted && invalid.kraBusinessName}
                      errorText={BUSINESS_NAME_ERROR}
                    >
                      <input
                        type="text"
                        maxLength={KRA_BUSINESS_NAME_MAX}
                        autoComplete="off"
                        value={form.kraBusinessName}
                        onChange={(e) => update('kraBusinessName', e.target.value)}
                        className={inputClass(attempted && invalid.kraBusinessName)}
                        placeholder="As registered with KRA"
                      />
                    </Field>
                  </div>
                  <p className="m-0 -mt-1 text-[12.5px] leading-[1.5] text-[rgba(243,240,234,.5)]">{ETIMS_INVOICE_NOTE}</p>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-[rgba(255,255,255,.08)] pt-5">
            {totals.discount > 0 && (
              <div className="flex items-center justify-between text-[13px] text-[rgba(243,240,234,.5)]">
                <span>
                  Subtotal ({form.quantity} {form.quantity === 1 ? 'card' : 'cards'})
                </span>
                <span className="line-through">{formatKes(totals.subtotal)}</span>
              </div>
            )}
            {totals.discountType === 'bulk' && (
              <div className="flex items-center justify-between text-[13px] text-accent">
                <span>Bulk discount (10% off 4+ cards)</span>
                <span>-{formatKes(totals.discount)}</span>
              </div>
            )}
            {totals.discountType === 'offer' && totals.offer && (
              <div className="flex items-center justify-between text-[13px] text-accent">
                <span>{totals.offer.name}</span>
                <span>-{formatKes(totals.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[13px] font-medium tracking-[.08em] text-grey-1">TOTAL</span>
              <span className="font-inter text-[20px] font-semibold text-accent">{formatKes(totals.total)}</span>
            </div>
          </div>

          {message && (
            <p role="alert" className={`m-0 text-[13.5px] leading-[1.5] ${message.error ? 'text-[#F87171]' : 'text-accent'}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'checking-out'}
            className="mt-1 w-full rounded-full bg-ivory px-7 py-[16px] text-[15.5px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white disabled:pointer-events-none disabled:opacity-60"
          >
            {status === 'checking-out' ? 'Redirecting to payment…' : 'Proceed to checkout'}
          </button>
          <PaymentLine />

          {form.business &&
            (status === 'quoted' ? (
              <p className="m-0 text-center text-[13px] leading-[1.55] text-accent">{QUOTE_CONFIRMATION_MESSAGE}</p>
            ) : (
              <p className="m-0 text-center text-[13px] leading-[1.5] text-[rgba(243,240,234,.5)]">
                Need a quotation for approval first?{' '}
                <button
                  type="button"
                  onClick={handleQuote}
                  disabled={status === 'quoting'}
                  className="text-accent underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-80 disabled:opacity-50"
                >
                  {status === 'quoting' ? 'Sending…' : 'Request a quote'}
                </button>
              </p>
            ))}
        </form>
      </div>
    </RevealSection>
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-[rgba(255,255,255,.22)] bg-[rgba(255,255,255,.03)] text-ink transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check size={14} strokeWidth={3} />
      </span>
      <span className="text-[15px] leading-[1.45] text-ivory">{children}</span>
    </label>
  );
}
