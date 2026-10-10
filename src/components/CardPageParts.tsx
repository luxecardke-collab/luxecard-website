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
// A line break ("\n") in the text starts a new line.
export function Headline({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, l) => (
        <Fragment key={l}>
          {l > 0 && <br />}
          {headlineParts(line).map((part, i) =>
            part.gold ? (
              <span key={i} className="text-accent">
                {part.text}
              </span>
            ) : (
              part.text
            )
          )}
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

