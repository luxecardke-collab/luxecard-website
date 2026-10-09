import { LINKS } from '../data/links';
import { useReveal } from '../hooks/useReveal';

export function ContactVisit() {
  const { ref, style } = useReveal<HTMLDivElement>();

  return (
    <section
      id="contact"
      className="scroll-mt-[84px] border-t border-[rgba(255,255,255,.06)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,48px)]">
        <div className="grid gap-[clamp(32px,5vw,64px)] md:grid-cols-2 md:items-center">
          <div ref={ref} style={style}>
            {/* One heading; its wording is shorter on phones. */}
            <h2 className="m-0 mb-[clamp(28px,4vh,40px)] font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]">
              <span className="md:hidden">FIND US.</span>
              <span className="hidden md:inline">
                CONTACT
                <br />
                &amp; VISIT US.
              </span>
            </h2>

            <p className="m-0 mb-8 max-w-[320px] text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.7)] md:hidden">
              {LINKS.ADDRESS} KE
              <br />
              124 Manyani East Road, Lavington
            </p>

            <div className="hidden flex-col gap-7 md:flex">
              <div>
                <div className="font-inter text-[10px] font-medium tracking-[.15em] text-accent">ADDRESS</div>
                <p className="m-0 mt-2 max-w-[320px] text-[16.5px] leading-[1.6] text-[rgba(243,240,234,.7)]">
                  {LINKS.ADDRESS}
                </p>
              </div>
              <div>
                <div className="font-inter text-[10px] font-medium tracking-[.15em] text-accent">PHONE</div>
                <a
                  href={LINKS.PHONE_TEL}
                  className="mt-2 block text-[16.5px] text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
                >
                  {LINKS.PHONE_DISPLAY}
                </a>
                <a
                  href={LINKS.PHONE2_TEL}
                  className="mt-1 block text-[16.5px] text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
                >
                  {LINKS.PHONE2_DISPLAY}
                </a>
              </div>
              <div>
                <div className="font-inter text-[10px] font-medium tracking-[.15em] text-accent">EMAIL</div>
                <a
                  href={LINKS.EMAIL_MAILTO}
                  className="mt-2 block text-[16.5px] text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
                >
                  {LINKS.EMAIL}
                </a>
              </div>
            </div>
          </div>

          <div className="-mx-[clamp(20px,4vw,48px)] md:mx-0 md:w-full md:overflow-hidden md:rounded-[20px] md:border md:border-[rgba(255,255,255,.08)]">
            <iframe
              title="LuxeCard location on Google Maps"
              src={LINKS.MAP_EMBED_SRC}
              className="h-[280px] w-full md:h-[420px]"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
