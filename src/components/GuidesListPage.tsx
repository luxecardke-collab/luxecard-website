import { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GUIDES } from '../data/guides';
import { useMountReveal } from '../hooks/useMountReveal';

// /guides: a simple list of articles. Same header/typography treatment as
// the legal pages (src/components/LegalPage.tsx).
export function GuidesListPage() {
  const headerStyle = useMountReveal(80);
  const bodyStyle = useMountReveal(220);

  useEffect(() => {
    document.title = 'Guides | LuxeCard';
  }, []);

  return (
    <main className="pt-[var(--nav-h)]">
      <header
        className="border-b border-[rgba(255,255,255,.06)] px-[clamp(20px,4vw,48px)] pb-[clamp(44px,7vh,72px)] pt-[clamp(48px,9vh,104px)]"
        style={{ background: 'radial-gradient(120% 90% at 78% 0%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
      >
        <div style={headerStyle} className="mx-auto max-w-[1120px]">
          <div className="mb-5 font-inter text-[10px] font-medium tracking-[.15em] text-accent">GUIDES</div>
          <h1 className="m-0 max-w-[820px] font-manrope text-[clamp(36px,5.4vw,68px)] font-bold leading-[1] max-md:leading-[1.06] tracking-[-.032em] text-balance">
            Guides
          </h1>
          <p className="m-0 mt-8 max-w-[720px] text-[clamp(16px,1.3vw,18px)] leading-[1.65] text-[rgba(243,240,234,.72)] text-pretty">
            Practical advice on business cards, design and getting the most out of your LuxeCard.
          </p>
        </div>
      </header>

      <div style={bodyStyle} className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vh,96px)]">
        <div className="flex flex-col gap-5">
          {GUIDES.map((guide) => (
            <a
              key={guide.path}
              href={guide.path}
              className="group flex flex-col items-start justify-between gap-5 rounded-[14px] border border-[rgba(255,255,255,.07)] bg-surface px-7 py-7 transition-colors duration-300 hover:border-[rgba(253,211,3,.35)] sm:flex-row sm:items-center"
            >
              <div className="max-w-[640px]">
                <h2 className="m-0 font-manrope text-[19px] font-semibold tracking-[-.01em]">{guide.title}</h2>
                <p className="m-0 mt-2 text-[15px] leading-[1.6] text-[rgba(243,240,234,.6)]">{guide.description}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-inter text-[13px] font-medium text-accent">
                Read
                <ArrowUpRight
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.8}
                  className="transition-transform duration-300 group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
                />
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
