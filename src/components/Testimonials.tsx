import { CUSTOMER_COUNT, TESTIMONIALS, type Testimonial } from '../data/content';
import { CountUp } from './CountUp';
import { RevealSection } from './RevealSection';

const ROW_ONE = TESTIMONIALS.slice(0, 3);
const ROW_TWO = TESTIMONIALS.slice(3, 6);

// The card pages pass their chosen testimonials (one row); the homepage
// shows all of them in two rows.
export function Testimonials({ testimonials }: { testimonials?: Testimonial[] } = {}) {
  return (
    <RevealSection
      // Can be on screen at load (the card pages on phones), so its entrance
      // starts from the first paint; elsewhere it reveals on scroll as before.
      revealOnFirstPaint
      id="testimonials"
      className="scroll-mt-[84px] overflow-hidden border-t border-[rgba(255,255,255,.06)] py-[clamp(90px,13vh,150px)] min-[900px]:scroll-mt-[80px]"
    >
      <h2 className="m-0 mb-[clamp(36px,5vh,56px)] px-[clamp(20px,4vw,48px)] text-center font-manrope text-[clamp(32px,4.4vw,58px)] font-bold leading-[.98] max-md:leading-[1.06] tracking-[-.032em] md:mb-[clamp(48px,7vh,80px)]">
        {/* Mobile: "LOVED BY 1000+ PROFESSIONALS." From md up the heading
            continues onto a second line: "ACROSS KENYA." */}
        LOVED BY <CountUp from={100} to={CUSTOMER_COUNT} suffix="+" className="text-accent" /> PROFESSIONALS
        <span className="hidden md:inline">
          <br />
          ACROSS KENYA
        </span>
        .
      </h2>

      <div className="flex flex-col gap-4 sm:gap-5">
        {testimonials ? (
          <MarqueeRow testimonials={testimonials} animationClassName="animate-marquee-left" />
        ) : (
          <>
            <MarqueeRow testimonials={ROW_ONE} animationClassName="animate-marquee-left" />
            <MarqueeRow testimonials={ROW_TWO} animationClassName="animate-marquee-right" />
          </>
        )}
      </div>
    </RevealSection>
  );
}

function MarqueeRow({
  testimonials,
  animationClassName,
}: {
  testimonials: Testimonial[];
  animationClassName: string;
}) {
  const items = [...testimonials, ...testimonials];

  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
    >
      <div className={`flex w-max gap-4 sm:gap-5 ${animationClassName} hover:[animation-play-state:paused]`}>
        {items.map((testimonial, i) => (
          <TestimonialCard key={`${testimonial.name}-${i}`} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="w-[260px] shrink-0 rounded-2xl border border-[rgba(255,255,255,.08)] bg-surface p-5 transition-colors duration-300 hover:border-[rgba(253,211,3,.32)] sm:w-[340px] sm:p-6">
      <div className="mb-4 flex items-center gap-1.5 text-accent">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} />
        ))}
      </div>
      <p className="m-0 text-[14px] leading-[1.6] text-[rgba(243,240,234,.75)] sm:text-[15px]">
        “{testimonial.quote}”
      </p>
      <div className="mt-5 font-inter text-[11.5px] font-medium uppercase tracking-[.14em] text-grey-1">
        {testimonial.name}
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M12 .9l3.1 6.6 7.1.9-5.2 5 1.4 7.1L12 17.4l-6.4 3.1L7 13.4 1.8 8.4l7.1-.9L12 .9z" />
    </svg>
  );
}
