import { useMountReveal } from '../hooks/useMountReveal';

// Shown for any URL that isn't a page (served as dist/404.html with a 404
// status). Same header treatment as the legal pages.
export function NotFound() {
  const style = useMountReveal(80);

  return (
    <main className="pt-[var(--nav-h)]">
      <section
        className="px-[clamp(20px,4vw,48px)] pb-[clamp(72px,12vh,140px)] pt-[clamp(56px,12vh,140px)]"
        style={{ background: 'radial-gradient(120% 90% at 78% 0%, #16161A 0%, #0B0B0D 46%, #08080A 100%)' }}
      >
        <div style={style} className="mx-auto max-w-[1120px]">
          <div className="mb-5 font-inter text-[10px] font-medium tracking-[.15em] text-accent">ERROR 404</div>
          <h1 className="m-0 max-w-[820px] font-manrope text-[clamp(36px,5.4vw,68px)] font-bold leading-[1] max-md:leading-[1.06] tracking-[-.032em] text-balance">
            PAGE NOT FOUND.
          </h1>
          <p className="m-0 mb-10 mt-6 max-w-[520px] text-[clamp(16px,1.3vw,18px)] leading-[1.6] text-[rgba(243,240,234,.6)] text-pretty">
            The page you’re looking for doesn’t exist or has moved.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2.5 rounded-full bg-ivory px-[30px] py-[17px] text-[15.5px] font-semibold text-bg transition-[transform,box-shadow] duration-[.4s] ease-lux hover:-translate-y-[3px]"
            style={{ boxShadow: '0 18px 44px -22px rgba(243,240,234,.6)' }}
          >
            Back to the LuxeCard homepage <span className="font-inter">→</span>
          </a>
        </div>
      </section>
    </main>
  );
}
