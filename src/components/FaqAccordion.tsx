import { Fragment, useState } from 'react';
import { FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { FINISH_LABELS_IN_ORDER } from '../data/content';
import { LINKS } from '../data/links';
import { useOffer } from '../hooks/useOffer';
import { offerHeadline, offerLastDay } from '../utils/offerText';
import { OfferPrice } from './OfferPrice';
import { useReveal } from '../hooks/useReveal';

// `group` (optional) prints a small heading above the first question of each
// group. Answers can hold placeholders: see TOKEN_PATTERN below.
export type FaqItem = { q: string; a: string; group?: string };

// Placeholders an answer can contain (see content.ts).
const TOKEN_PATTERN = /(\{contact\}|\{prices\}|\{offer\})/;

// "Plastic KES 7,000, Wood KES 9,000, …", with any offer applied.
function FinishPriceList() {
  const offer = useOffer();
  return (
    <>
      {FINISH_LABELS_IN_ORDER.map((label, i, all) => (
        <Fragment key={label}>
          {i > 0 && (i === all.length - 1 ? ', and ' : ', ')}
          {label} <OfferPrice price={FINISH_PRICES_BY_LABEL[label]} offer={offer} />
        </Fragment>
      ))}
    </>
  );
}

// Only while an offer is on: it replaces the bulk discount, it doesn't add to it.
function OfferNote() {
  const offer = useOffer();
  if (!offer) return null;
  return (
    <>
      {' '}
      <span className="text-accent">
        {offerHeadline(offer)} every card until {offerLastDay(offer)}, 23:59 EAT. It replaces the bulk discount rather
        than adding to it.
      </span>
    </>
  );
}

function FaqAnswer({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN_PATTERN).map((part, i) => {
        if (part === '{contact}') {
          return (
            <a
              key={i}
              href={LINKS.CONTACT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-80"
            >
              Contact us
            </a>
          );
        }
        if (part === '{prices}') return <FinishPriceList key={i} />;
        if (part === '{offer}') return <OfferNote key={i} />;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function FaqRow({
  faq,
  open,
  onToggle,
  index,
  endsGroup,
}: {
  faq: FaqItem;
  open: boolean;
  onToggle: () => void;
  index: number;
  endsGroup: boolean;
}) {
  const { ref, style } = useReveal<HTMLDivElement>(index * 70);

  // Rules only separate questions: none after the last row of a group (the
  // next group's spacing does that job) or after the last row overall.
  return (
    <div
      ref={ref}
      style={style}
      className={`${endsGroup ? '' : 'border-b border-[rgba(255,255,255,.09)]'} last:border-b-0`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-5 py-[26px] text-left font-manrope text-[clamp(17px,1.9vw,23px)] tracking-[-.02em] transition-colors duration-300 hover:text-accent"
      >
        <span>{faq.q}</span>
        <span
          className="font-inter text-[15px] text-grey-1 transition-transform duration-[.45s] ease-lux"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? '520px' : '0px',
          opacity: open ? 1 : 0,
          transition: 'max-height .55s cubic-bezier(.16,1,.3,1), opacity .45s ease',
        }}
      >
        <p className="m-0 max-w-[640px] px-1 pb-7 text-[16.5px] leading-[1.65] text-[rgba(243,240,234,.55)]">
          <FaqAnswer text={faq.a} />
        </p>
      </div>
    </div>
  );
}

function FaqGroupHeading({ label, first }: { label: string; first: boolean }) {
  return (
    <h3
      className={`m-0 pb-3 font-inter text-[11px] font-medium uppercase tracking-[.16em] text-grey-1 ${
        first ? '' : 'mt-[clamp(40px,6vh,64px)]'
      }`}
    >
      {label}
    </h3>
  );
}

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div>
      {faqs.map((faq, i) => {
        const open = openIndex === i;
        const startsGroup = faq.group !== undefined && faq.group !== faqs[i - 1]?.group;
        const endsGroup = faq.group !== undefined && faq.group !== faqs[i + 1]?.group;
        return (
          <Fragment key={faq.q}>
            {startsGroup && <FaqGroupHeading label={faq.group!} first={i === 0} />}
            <FaqRow
              faq={faq}
              open={open}
              onToggle={() => setOpenIndex((v) => (v === i ? -1 : i))}
              index={i}
              endsGroup={endsGroup}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
