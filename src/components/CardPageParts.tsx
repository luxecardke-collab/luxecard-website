import { Fragment } from 'react';
import { headlineParts, type CardPage } from '../data/cardPages';

// Pieces shared by a card page's sections and its order form.

// The colour of each finish's swatch.
const SWATCH_COLOURS: Record<string, string> = {
  Natural: 'linear-gradient(135deg, #D6A46C, #9C6535)',
  Black: 'linear-gradient(135deg, #3A3836, #0E0E0F)',
  Silver: 'linear-gradient(135deg, #E9E9EC, #8E9096)',
  Gold: 'linear-gradient(135deg, #F7DE7A, #B8892A)',
};

// A headline from cardPages.ts, its [bracketed] part in gold.
// A line break ("\n") in the text starts a new line; a "|" starts one from
// 900px only, where the section goes two-column (a space below that), and a
// "~" below 900px only (a space from there).
export function Headline({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, l) => (
        <Fragment key={l}>
          {l > 0 && <br />}
          {/* "|": a space below 900px, a line break from there, where each
              of its lines also stays whole (the narrow column is a few
              pixels short of "EVERY DAY." at some widths). */}
          {line.includes('|')
            ? line.split('|').map((segment, s, segments) => (
                <Fragment key={s}>
                  {s > 0 && <br className="max-[899px]:hidden" />}
                  <span className="min-[900px]:whitespace-nowrap">
                    {/* The space stays in the text before the break, so
                        phones lay it out exactly as a plain space. */}
                    <HeadlineParts text={s < segments.length - 1 ? `${segment} ` : segment} />
                  </span>
                </Fragment>
              ))
            : <HeadlineParts text={line} />}
        </Fragment>
      ))}
    </>
  );
}

function HeadlineParts({ text }: { text: string }) {
  return (
    <>
      {headlineParts(text).map((part, i) =>
        part.gold ? (
          <span key={i} className="text-accent">
            <BelowDesktopBreaks text={part.text} />
          </span>
        ) : (
          <BelowDesktopBreaks key={i} text={part.text} />
        )
      )}
    </>
  );
}

// "~": a line break below 900px, a space from there.
function BelowDesktopBreaks({ text }: { text: string }) {
  if (!text.includes('~')) return <>{text}</>;
  return (
    <>
      {text.split('~').map((piece, p, pieces) => (
        <Fragment key={p}>
          {p > 0 && <br className="min-[900px]:hidden" />}
          {p < pieces.length - 1 ? `${piece} ` : piece}
        </Fragment>
      ))}
    </>
  );
}

// The finish choice (Natural / Black, …): picking one in the hero swaps
// its photo and pre-selects it in the order form.
export function FinishSwatches({
  card,
  finish,
  onFinish,
  label,
}: {
  card: CardPage;
  finish: string | null;
  onFinish: (finish: string) => void;
  label: string;
}) {
  if (!card.finishes) return null;
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {card.finishes.map((choice) => {
        const selected = choice.label === finish;
        return (
          <button
            key={choice.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onFinish(choice.label)}
            className="inline-flex items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-[14px] transition-colors duration-300"
            style={{
              borderColor: selected ? 'rgba(253,211,3,.6)' : 'rgba(255,255,255,.14)',
              background: selected ? 'rgba(253,211,3,.07)' : 'rgba(255,255,255,.02)',
              color: selected ? '#F3F0EA' : 'rgba(243,240,234,.7)',
            }}
          >
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-full border border-[rgba(255,255,255,.25)]"
              style={{ background: SWATCH_COLOURS[choice.label] ?? '#333' }}
            />
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

