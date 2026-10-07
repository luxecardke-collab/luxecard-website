import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useCart, type CartItem } from '../context/cartContext';
import { useInquiryModal } from '../context/inquiryModalContext';
import { LINKS } from '../data/links';
import { getReferralCode } from '../utils/referralCode';
import { getMetaCheckoutTracking, trackMetaEventWithServer } from '../utils/metaPixel';
import { getAttribution } from '../utils/attribution';
import { HONEYPOT_NAME } from '../utils/honeypot';
import { sendQuoteRequest } from '../utils/cartLead';
import { BULK_DISCOUNT_THRESHOLD, FINISH_PRICES_BY_LABEL, offerUnitPrice, productId, type Offer } from '../../api/_lib/pricing';
import { offerHeadline, offerLastDay } from '../utils/offerText';
import { syncServerClock } from '../utils/serverClock';
import { OfferPrice } from './OfferPrice';

const QUOTE_CONFIRMATION_MESSAGE = 'Request received. Your quotation will be in your inbox shortly.';

function formatPrice(value: number) {
  return `KES ${value.toLocaleString()}`;
}

export function CartDrawer() {
  const {
    items,
    isOpen,
    close,
    removeItem,
    updateQuantity,
    totalCount,
    subtotal,
    discount,
    totalPrice,
    discountType,
    offer,
    customerInfo,
    notify,
  } = useCart();
  // Item prices show the offer only when it's the discount that applies.
  const rowOffer = discountType === 'offer' ? offer : null;
  // After checkout reports that prices changed, the server's new total —
  // shown to the customer in that message — is what the next attempt
  // agrees to pay, even if this page still can't read the server's time.
  const confirmedTotal = useRef<number | null>(null);
  useEffect(() => {
    confirmedTotal.current = null;
  }, [items]);

  // The cart can't wait for the page-load sync: prices must follow the
  // server's clock (and any offer) the moment it's open.
  useEffect(() => {
    if (isOpen) void syncServerClock();
  }, [isOpen]);
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();
  const panelRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const isBusinessOrder = customerInfo?.orderType === 'business';

  useEffect(() => {
    // Safety net for returning from Paystack's hosted checkout via the
    // browser's back navigation: some browsers restore this page from the
    // back/forward cache rather than remounting it, which would otherwise
    // leave the button frozen on "Redirecting to payment…" until a manual
    // refresh. cancel_action (set in api/checkout.ts) is the primary path
    // back for an explicit cancel; this also covers any other way the user
    // ends up back here mid-checkout.
    const onPageShow = () => setCheckingOut(false);
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [isOpen, close]);

  // Reopening the drawer offers the link again, even after an earlier
  // request in this session went through.
  useEffect(() => {
    if (isOpen) setQuoteStatus('idle');
  }, [isOpen]);

  const handleRequestQuote = async () => {
    if (!customerInfo || quoteStatus === 'sending') return;
    setQuoteStatus('sending');
    const ok = await sendQuoteRequest({
      type: 'business',
      fullName: customerInfo.name,
      company: customerInfo.company,
      email: customerInfo.email,
      phone: customerInfo.phone,
      items: items.map((i) => ({ name: i.name, subOption: i.subOption, quantity: i.quantity })),
      quoteRequested: true,
      ...(customerInfo.etims
        ? { needsEtims: true, kraPin: customerInfo.etims.kraPin, kraBusinessName: customerInfo.etims.businessName }
        : {}),
      hp: honeypotRef.current?.value ?? '',
    });
    if (ok) {
      setQuoteStatus('sent');
    } else {
      setQuoteStatus('idle');
      notify('Could not send your quote request', 'Please try again in a moment.');
    }
  };

  const handleCheckout = async () => {
    if (!customerInfo) {
      notify('Add your details first', 'Please fill in the order form so we know who to send this to.');
      close();
      openInquiryModal('individual');
      return;
    }

    // Browser + Conversions API, same event ID; no-op without cookie consent.
    trackMetaEventWithServer(
      'InitiateCheckout',
      {
        value: totalPrice,
        currency: 'KES',
        num_items: totalCount,
        content_type: 'product',
        content_ids: [...new Set(items.map((i) => productId(i.name)))],
        contents: items.map((i) => ({ id: productId(i.name), quantity: i.quantity, item_price: offerUnitPrice(unitPrice(i), rowOffer) })),
      },
      { email: customerInfo.email, phone: customerInfo.phone }
    );

    setCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ name: i.name, subOption: i.subOption, quantity: i.quantity })),
          customer: customerInfo,
          referralCode: getReferralCode(),
          // Only present when the visitor accepted cookies; without it the
          // server never sends this purchase to Meta.
          metaTracking: getMetaCheckoutTracking() ?? undefined,
          // Checkout refuses to charge anything other than this.
          expectedTotal: confirmedTotal.current ?? totalPrice,
          // Which campaign/ad set/ad they came from, saved on the order.
          attribution: getAttribution(),
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'PRICE_CHANGED') {
        // e.g. the offer ended while the cart was open: show the new price
        // rather than charging it unannounced.
        confirmedTotal.current = typeof data.total === 'number' ? data.total : null;
        void syncServerClock(true);
        notify('Prices have changed', data.error);
        setCheckingOut(false);
        return;
      }
      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error ?? 'Could not start checkout.');
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      notify('Checkout failed', err instanceof Error ? err.message : 'Please try again.');
      setCheckingOut(false);
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Your cart"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className="fixed inset-y-0 right-0 z-[210] flex w-full max-w-[420px] flex-col border-l border-[rgba(255,255,255,.1)] shadow-2xl"
      style={{
        background: 'radial-gradient(140% 100% at 100% 0%, #17171B 0%, #0C0C0E 60%)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        boxShadow: '0 40px 90px -30px rgba(0,0,0,.7)',
        pointerEvents: isOpen ? 'auto' : 'none',
        // Hidden once the close slide finishes so the off-screen panel isn't
        // painted or focusable; shown immediately on open so the slide-in is visible.
        visibility: isOpen ? 'visible' : 'hidden',
        transition: `transform 600ms ease-in-out, visibility 0s linear ${isOpen ? '0s' : '600ms'}`,
      }}
    >
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,.08)] px-6 py-5">
        <h2 className="m-0 font-manrope text-[20px] font-bold tracking-[-.02em]">Your Cart</h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,.14)] text-[15px] text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          <X size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="m-0 text-[15px] leading-[1.6] text-[rgba(243,240,234,.5)]">Your cart is empty.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                offer={rowOffer}
                onQuantityChange={(quantity) => updateQuantity(item.id, quantity)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[rgba(255,255,255,.08)] px-6 py-5">
        {discount > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] text-[rgba(243,240,234,.5)]">
              Subtotal ({totalCount} {totalCount === 1 ? 'card' : 'cards'})
            </span>
            <span className="text-[13px] text-[rgba(243,240,234,.5)] line-through">{formatPrice(subtotal)}</span>
          </div>
        )}
        {discountType === 'bulk' && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] text-accent">Bulk discount (10% off 4+ cards)</span>
            <span className="text-[13px] text-accent">-{formatPrice(discount)}</span>
          </div>
        )}
        {discountType === 'offer' && offer && (
          <div className="mb-3 flex items-start justify-between gap-4">
            <span className="text-[13px] leading-[1.45] text-accent">
              {offerHeadline(offer)}
              <span className="block text-[11.5px] text-[rgba(253,211,3,.7)]">
                Ends {offerLastDay(offer)}, 23:59 EAT
                {totalCount > BULK_DISCOUNT_THRESHOLD && ". Doesn't combine with the 4+ card bulk discount."}
              </span>
            </span>
            <span className="shrink-0 text-[13px] text-accent">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-inter text-[13px] font-medium tracking-[.08em] text-grey-1">TOTAL</span>
          <span className="font-inter text-[18px] font-semibold text-accent">{formatPrice(totalPrice)}</span>
        </div>
        {items.length > 0 && (
          <p className="m-0 mb-4 text-[12.5px] leading-[1.55] text-[rgba(243,240,234,.5)]">
            Pay → approve your design → ready in 2 business days.
          </p>
        )}
        <button
          type="button"
          onClick={handleCheckout}
          onMouseEnter={preloadInquiryModal}
          onFocus={preloadInquiryModal}
          disabled={items.length === 0 || checkingOut}
          className="w-full rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white disabled:pointer-events-none disabled:opacity-60"
        >
          {checkingOut ? 'Redirecting to payment…' : 'Proceed to Checkout'}
        </button>
        {items.length > 0 && (
          <p className="m-0 mt-3 text-center text-[11.5px] leading-[1.5] text-[rgba(243,240,234,.45)]">
            Secure payment by Paystack · M-Pesa, Airtel Money or card ·{' '}
            <a
              href={LINKS.LEGAL.returns}
              className="whitespace-nowrap underline decoration-[rgba(243,240,234,.3)] underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
            >
              Returns policy
            </a>
          </p>
        )}

        {items.length > 0 && isBusinessOrder && (
          <>
            <input
              ref={honeypotRef}
              type="text"
              name={HONEYPOT_NAME}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />
            {quoteStatus === 'sent' ? (
              <p className="m-0 mt-4 text-center text-[13px] leading-[1.55] text-accent">
                {QUOTE_CONFIRMATION_MESSAGE}
              </p>
            ) : (
              <p className="m-0 mt-4 text-center text-[13px] leading-[1.5] text-[rgba(243,240,234,.5)]">
                Need a quotation for approval first?{' '}
                <button
                  type="button"
                  onClick={handleRequestQuote}
                  disabled={quoteStatus === 'sending'}
                  className="text-accent underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-80 disabled:opacity-50"
                >
                  {quoteStatus === 'sending' ? 'Sending…' : 'Request a quote'}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// The current list price (an item stores the price from when it was added).
function unitPrice(item: CartItem): number {
  return FINISH_PRICES_BY_LABEL[item.name] ?? item.price;
}

function CartRow({
  item,
  offer,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  offer: Offer | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-1 flex-col gap-2">
        <div>
          <div className="text-[15px] font-medium text-ivory">{item.name}</div>
          {item.subOption && (
            <div className="mt-0.5 text-[13px] text-[rgba(243,240,234,.5)]">{item.subOption}</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-[rgba(255,255,255,.14)] p-1">
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity - 1)}
              aria-label="Decrease quantity"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
            >
              <Minus size={13} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <span className="w-6 text-center text-[13.5px] text-ivory">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(item.quantity + 1)}
              aria-label="Increase quantity"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
            >
              <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove item"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(243,240,234,.4)] transition-colors duration-300 hover:text-[#ff8a8a]"
          >
            <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 pt-0.5">
        <span className="text-[15px] font-medium text-ivory">
          <OfferPrice price={unitPrice(item)} quantity={item.quantity} offer={offer} />
        </span>
        <span className="text-[12px] text-[rgba(243,240,234,.4)]">
          {formatPrice(offerUnitPrice(unitPrice(item), offer))} each
        </span>
      </div>
    </div>
  );
}
