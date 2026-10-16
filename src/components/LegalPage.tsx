import { Fragment, useEffect, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LEGAL_DOCS, type LegalBlock, type LegalDoc } from '../data/legal';
import { useMountReveal } from '../hooks/useMountReveal';

const EMAIL_RE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

// Render the copy's light inline markup: **bold** runs, and email addresses
// as mailto links.
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ivory">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return (
      <Fragment key={i}>
        {part.split(EMAIL_RE).map((chunk, j) =>
          j % 2 === 1 ? (
            <a
              key={j}
              href={`mailto:${chunk}`}
              className="text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent"
            >
              {chunk}
            </a>
          ) : (
            chunk
          ),
        )}
      </Fragment>
    );
  });
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') {
    return <p className="m-0">{renderInline(block)}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {block.list.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-[.7em] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
          <span>{renderInline(item)}</span>
        </li>
      ))}
    </ul>
  );
}

const sectionId = (i: number) => `section-${i + 1}`;
const pad = (n: number) => String(n).padStart(2, '0');

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const headerStyle = useMountReveal(80);
  const bodyStyle = useMountReveal(220);
  const others = LEGAL_DOCS.filter((d) => d.path !== doc.path);

  useEffect(() => {
    document.title = `${doc.title} | LuxeCard`;
  }, [doc.title]);

  return (
    <main className="pt-[var(--nav-h)]">
      <header
        className="border-b border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] pb-[clamp(44px,7vh,72px)] pt-[clamp(48px,9vh,104px)]"
        style={{ background: 'radial-gradient(120% 90% at 78% 0%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
      >
        <div style={headerStyle} className="mx-auto max-w-[1120px]">
          <div className="mb-5 font-inter text-[10px] font-medium tracking-[.15em] text-accent">LEGAL</div>
          <h1 className="m-0 max-w-[820px] font-manrope text-[clamp(36px,5.4vw,68px)] font-bold leading-[1] max-md:leading-[1.06] tracking-[-.032em] text-balance">
            {doc.title}
          </h1>
          <p className="m-0 mt-6 font-inter text-[11px] font-medium tracking-[.14em] text-grey-1">
            EFFECTIVE {doc.effectiveDate.toUpperCase()}
          </p>
          <p className="m-0 mt-8 max-w-[720px] text-[clamp(16px,1.3vw,18px)] leading-[1.65] text-[rgba(243,240,234,.72)] text-pretty">
            {renderInline(doc.intro)}
          </p>
        </div>
      </header>

      <div
        style={bodyStyle}
        className="mx-auto grid max-w-[1120px] gap-12 px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vh,96px)] lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20"
      >
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-[calc(var(--nav-h)+32px)]">
            <div className="mb-4 font-inter text-[10px] font-medium tracking-[.15em] text-grey-2">ON THIS PAGE</div>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {doc.sections.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#${sectionId(i)}`}
                    className="group flex gap-3 text-[13px] leading-[1.4] text-[rgba(243,240,234,.5)] transition-colors hover:text-ivory"
                  >
                    <span className="w-5 shrink-0 font-inter tabular-nums text-grey-3 transition-colors group-hover:text-accent">
                      {pad(i + 1)}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-[720px]">
          {doc.sections.map((s, i) => (
            <section
              key={s.title}
              id={sectionId(i)}
              className="scroll-mt-[calc(var(--nav-h)+24px)] border-t border-[rgba(255,255,255,.07)] py-[clamp(28px,4vh,40px)] first:border-t-0 first:pt-0"
            >
              <h2 className="m-0 mb-4 flex items-center gap-4 font-manrope text-[clamp(20px,1.9vw,24px)] font-semibold leading-[1.25] tracking-[-.02em]">
                <span className="font-inter text-[12px] font-medium tracking-[.1em] tabular-nums text-accent">
                  {pad(i + 1)}
                </span>{' '}
                {s.title}
              </h2>
              <div className="flex flex-col gap-4 text-[16px] leading-[1.75] text-[rgba(243,240,234,.72)] text-pretty">
                {s.body.map((block, j) => (
                  <Block key={j} block={block} />
                ))}
              </div>
            </section>
          ))}

          <div className="mt-[clamp(32px,5vh,56px)] border-t border-[rgba(255,255,255,.07)] pt-[clamp(32px,5vh,48px)]">
            <div className="mb-5 font-inter text-[10px] font-medium tracking-[.15em] text-grey-2">OTHER POLICIES</div>
            <div className="grid gap-4 sm:grid-cols-2">
              {others.map((d) => (
                <a
                  key={d.path}
                  href={d.path}
                  className="group flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(255,255,255,.07)] bg-surface px-6 py-5 transition-colors duration-300 hover:border-[rgba(253,211,3,.35)]"
                >
                  <span className="font-manrope text-[17px] font-semibold tracking-[-.01em]">{d.title}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.6}
                    className="shrink-0 text-grey-1 transition-[color,transform] duration-300 group-hover:-translate-y-[2px] group-hover:translate-x-[2px] group-hover:text-accent"
                  />
                </a>
              ))}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
