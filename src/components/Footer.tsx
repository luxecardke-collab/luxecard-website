import { ArrowUpRight } from 'lucide-react';
import { useContactModal } from '../context/contactModalContext';
import { FOOTER_LINKS } from '../data/content';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReveal } from '../hooks/useReveal';
import { useResolveNavHref } from '../utils/navHref';
import { openCookieSettings } from '../utils/consent';
import { META_PIXEL_ENABLED } from '../utils/metaPixel';
import { WHATSAPP_SOURCES, whatsappLinkProps } from '../utils/whatsapp';

// Brand icons, all from the same set, Tabler Icons (outline style, MIT
// licence, v3.48.0), so they share one 24px grid, cap/join style and stroke
// weight. Paths are copied verbatim from @tabler/icons rather than adding the
// package as a dependency.
const SOCIAL_ICON_PATHS: Partial<Record<string, string[]>> = {
  Instagram: [
    'M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4l0 -8',
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    'M16.5 7.5v.01',
  ],
  LinkedIn: [
    'M8 11v5',
    'M8 8v.01',
    'M12 16v-5',
    'M16 16v-3a2 2 0 1 0 -4 0',
    'M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10',
  ],
  Facebook: ['M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3'],
  TikTok: [
    'M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917',
  ],
  YouTube: [
    'M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8',
    'M10 9l5 3l-5 3l0 -6',
  ],
};

// Icons per row in the Connect column: Instagram, LinkedIn, Facebook on the
// first row; TikTok and YouTube underneath.
const SOCIAL_ICONS_PER_ROW = 3;

function SocialIcon({ paths }: { paths: string[] }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Footer() {
  const { ref, style } = useReveal<HTMLElement>();
  const wide = useMediaQuery('(min-width: 900px)');
  const { open: openContactModal } = useContactModal();
  const resolveNavHref = useResolveNavHref();

  return (
    <footer
      ref={ref}
      data-whatsapp-landmark="footer"
      style={style}
      className="border-t border-[rgba(255,255,255,.07)] bg-bg px-[clamp(20px,4vw,48px)] pb-[clamp(56px,8vh,88px)] pt-[clamp(56px,8vh,88px)]"
    >
      <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-10">
        <div>
          <img
            src="/images/luxecard-logo-tagline.webp"
            alt="LuxeCard: Networking Partner"
            width={551}
            height={180}
            loading="lazy"
            decoding="async"
            className="h-12 w-auto sm:h-14"
          />
        </div>
        <div className="flex flex-wrap gap-12">
          <div className="flex flex-col gap-3">
            <div className="mb-1 font-inter text-[10px] font-medium tracking-[.15em] text-accent">
              {FOOTER_LINKS.columnOne.title.toUpperCase()}
            </div>
            {FOOTER_LINKS.columnOne.links.map((link) => (
              <a
                key={link.href}
                href={resolveNavHref(link.href)}
                className="text-sm text-[rgba(243,240,234,.6)] hover:text-accent"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div className="mb-1 font-inter text-[10px] font-medium tracking-[.15em] text-accent">
              {FOOTER_LINKS.columnTwo.title.toUpperCase()}
            </div>
            {FOOTER_LINKS.columnTwo.links
              .filter((link) => !SOCIAL_ICON_PATHS[link.label])
              .map((link) => {
                if (link.label === 'Contact' && !wide) {
                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={openContactModal}
                      className="text-left text-sm text-[rgba(243,240,234,.6)] hover:text-accent"
                    >
                      {link.label}
                    </button>
                  );
                }
                const external = link.href.startsWith('http');
                return (
                  <a
                    key={link.label}
                    className="text-sm text-[rgba(243,240,234,.6)] hover:text-accent"
                    {...(link.label === 'Contact'
                      ? whatsappLinkProps(WHATSAPP_SOURCES.footer)
                      : { href: link.href, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) })}
                  >
                    {link.label}
                  </a>
                );
              })}
            <div
              className="mt-1 grid gap-x-4 gap-y-3"
              style={{ gridTemplateColumns: `repeat(${SOCIAL_ICONS_PER_ROW}, max-content)` }}
            >
              {FOOTER_LINKS.columnTwo.links
                .filter((link) => SOCIAL_ICON_PATHS[link.label])
                .map((link) => {
                  const paths = SOCIAL_ICON_PATHS[link.label]!;
                  const external = link.href.startsWith('http');
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      aria-label={link.label}
                      className="text-[rgba(243,240,234,.6)] hover:text-accent"
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <SocialIcon paths={paths} />
                    </a>
                  );
                })}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="mb-1 font-inter text-[10px] font-medium tracking-[.15em] text-accent">
              {FOOTER_LINKS.columnThree.title.toUpperCase()}
            </div>
            {FOOTER_LINKS.columnThree.links.map((link) => (
              <a key={link.label} href={link.href} className="text-sm text-[rgba(243,240,234,.6)] hover:text-accent">
                {link.label}
              </a>
            ))}
            {META_PIXEL_ENABLED && (
              <button
                type="button"
                onClick={openCookieSettings}
                className="text-left text-sm text-[rgba(243,240,234,.6)] hover:text-accent"
              >
                Cookie settings
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-[clamp(40px,6vh,64px)] flex max-w-[1320px] flex-wrap justify-between gap-x-7 gap-y-4 pt-[22px] font-inter text-[10px] tracking-[.14em] text-ivory">
        <span>© 2026 LUXECARD LIMITED</span>
        <span data-whatsapp-landmark="footer-credit">
          DESIGNED & BUILT BY{' '}
          <a
            href="https://the-company-design-website.vercel.app/?utm_source=luxecard&utm_medium=footer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TheCompany.design (opens in a new tab)"
            // The ::before widens the tap area (the text is only 10px tall)
            // without changing layout.
            className="group relative inline-flex items-center gap-[3px] whitespace-nowrap rounded-[2px] text-accent/80 transition-colors duration-200 before:absolute before:-inset-x-2 before:-inset-y-4 before:content-[''] hover:text-accent focus-visible:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current"
          >
            <span className="underline decoration-1 underline-offset-[3px]">THECOMPANY.DESIGN</span>
            <ArrowUpRight
              aria-hidden="true"
              size={11}
              strokeWidth={1.8}
              className="shrink-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-[1.5px] motion-safe:group-hover:translate-x-[1.5px] motion-safe:group-focus-visible:-translate-y-[1.5px] motion-safe:group-focus-visible:translate-x-[1.5px]"
            />
          </a>
        </span>
      </div>
    </footer>
  );
}
