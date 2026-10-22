import { Fragment, useEffect, type ReactNode } from 'react';
import { type Guide, type GuideBlock } from '../data/guides';
import { useMountReveal } from '../hooks/useMountReveal';

// Render the article's light inline markup: **bold** runs and [text](url)
// links, the same syntax the source article was written in. Bold can wrap a
// link ("**[Plastic](url)**"), so bold runs are parsed recursively.
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ivory">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          className="text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ block }: { block: GuideBlock }) {
  if (block.type === 'p') {
    return <p className="m-0">{renderInline(block.text)}</p>;
  }
  if (block.type === 'list') {
    return (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {block.items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-[.7em] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  // A table: scrolls on its own on narrow screens instead of widening the
  // page, with the article's side padding bled into the scroll area so the
  // table can reach the edge like the rest of the content does.
  return (
    <div className="-mx-[clamp(20px,4vw,48px)] overflow-x-auto px-[clamp(20px,4vw,48px)] sm:mx-0 sm:overflow-visible sm:px-0">
      <table className="w-full min-w-[480px] border-collapse text-left">
        <thead>
          <tr>
            {block.headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-[rgba(255,255,255,.12)] pb-3 pr-6 font-inter text-[11px] font-medium tracking-[.1em] text-grey-1"
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-[rgba(255,255,255,.07)] py-4 pr-6 text-[15px] leading-[1.6] text-[rgba(243,240,234,.72)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const sectionId = (i: number) => `section-${i + 1}`;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function GuidePage({ guide }: { guide: Guide }) {
  const headerStyle = useMountReveal(80);
  const bodyStyle = useMountReveal(220);

  useEffect(() => {
    document.title = guide.seoTitle;
  }, [guide.seoTitle]);

  return (
    <main className="pt-[var(--nav-h)]">
      <header
        className="border-b border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] pb-[clamp(44px,7vh,72px)] pt-[clamp(48px,9vh,104px)]"
        style={{ background: 'radial-gradient(120% 90% at 78% 0%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
      >
        <div style={headerStyle} className="mx-auto max-w-[1120px]">
          <nav aria-label="Breadcrumb" className="mb-5 font-inter text-[10px] font-medium tracking-[.15em] text-accent">
            <a href="/guides" className="hover:text-ivory">
              GUIDES
            </a>
          </nav>
          <h1 className="m-0 max-w-[820px] font-manrope text-[clamp(32px,4.6vw,56px)] font-bold leading-[1.1] max-md:leading-[1.14] tracking-[-.028em] text-balance">
            {guide.title}
          </h1>
          <p className="m-0 mt-6 font-inter text-[11px] font-medium tracking-[.14em] text-grey-1">
            {formatDate(guide.date).toUpperCase()} · BY {guide.author.toUpperCase()}
          </p>
        </div>
      </header>

      <div style={bodyStyle} className="mx-auto max-w-[760px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vh,96px)]">
        <article className="flex flex-col gap-4 text-[16px] leading-[1.75] text-[rgba(243,240,234,.72)] text-pretty">
          {guide.intro.map((p, i) => (
            <p key={i} className="m-0">
              {renderInline(p)}
            </p>
          ))}
        </article>

        {guide.sections.map((s, i) => (
          <section
            key={s.heading}
            id={sectionId(i)}
            className="scroll-mt-[calc(var(--nav-h)+24px)] border-t border-[rgba(255,255,255,.07)] py-[clamp(28px,4vh,40px)]"
          >
            <h2 className="m-0 mb-4 flex items-center gap-4 font-manrope text-[clamp(20px,1.9vw,24px)] font-semibold leading-[1.25] tracking-[-.02em]">
              <span className="font-inter text-[12px] font-medium tracking-[.1em] tabular-nums text-accent">
                {pad(i + 1)}
              </span>{' '}
              {s.heading}
            </h2>
            <div className="flex flex-col gap-4 text-[16px] leading-[1.75] text-[rgba(243,240,234,.72)] text-pretty">
              {s.blocks.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </div>
          </section>
        ))}

        <section className="border-t border-[rgba(255,255,255,.07)] py-[clamp(28px,4vh,40px)]">
          <h2 className="m-0 mb-6 font-manrope text-[clamp(20px,1.9vw,24px)] font-semibold leading-[1.25] tracking-[-.02em]">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-7">
            {guide.faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="m-0 mb-2 font-manrope text-[17px] font-semibold leading-[1.4]">{faq.q}</h3>
                <p className="m-0 text-[15px] leading-[1.7] text-[rgba(243,240,234,.65)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-[clamp(28px,4vh,40px)] border-t border-[rgba(255,255,255,.07)] pt-[clamp(32px,5vh,48px)] text-center">
          <p className="m-0 mb-6 font-manrope text-[18px] font-semibold tracking-[-.01em]">
            Ready for a card people remember?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2.5 rounded-full bg-ivory px-[30px] py-[17px] text-[15.5px] font-semibold text-bg transition-[transform,box-shadow] duration-[.4s] ease-lux hover:-translate-y-[3px]"
            style={{ boxShadow: '0 18px 44px -22px rgba(243,240,234,.6)' }}
          >
            {guide.ctaLabel} <span className="font-inter">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
