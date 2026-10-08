import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type Ref,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  PROFESSIONAL_CHIPS,
  PROFESSIONAL_PHOTOS,
  type PhotoMaterial,
  type ProfessionalPhoto,
} from '../data/content';
import { useHydrated } from '../hooks/useHydrated';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReveal } from '../hooks/useReveal';
import { getLenis } from '../utils/lenisInstance';
import { RevealSection } from './RevealSection';

const GRID_COLUMNS = 3;
const COLLAPSED_COUNT = GRID_COLUMNS * 3; // the desktop grid starts as three rows
const EXPAND_MS = 650;
// "Show less" can have thousands of pixels to travel when the grid is fully open,
// so its duration grows with the distance (within these bounds).
const COLLAPSE_MIN_MS = EXPAND_MS;
const COLLAPSE_MAX_MS = 1500;
const COLLAPSE_MS_PER_PX = 0.22;
const FADE_MS = 350;
// Height of the blur band over the last collapsed row: a fraction of the row,
// but never so short that the button doesn't fit comfortably inside it.
const OVERLAY_ROW_FRACTION = 0.38;
const OVERLAY_MIN_PX = 120;

const MATERIAL_FILTERS: { value: PhotoMaterial; label: string }[] = [
  { value: 'plastic', label: 'Plastic' },
  { value: 'wood', label: 'Wood' },
  { value: 'metallic', label: 'Metallic' },
];

// A card page passes its own heading and that card's photos (no finish
// filter then); the homepage shows every finish.
export function Professionals({ heading, cardPhotos }: { heading?: ReactNode; cardPhotos?: ProfessionalPhoto[] } = {}) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [filter, setFilter] = useState<PhotoMaterial | null>('plastic');
  // Each finish keeps its own slide position, independent of the others.
  const positions = useRef<Record<string, number>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // On phones, once the section is about a screen away, quietly fetch the first
  // couple of photos of every finish (low priority, skipped under Data Saver),
  // so switching finish shows a photo straight away instead of waiting on the
  // network. The rest of each finish still loads as its carousel is used.
  useEffect(() => {
    const section = sectionRef.current;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!isMobile || !section || saveData || cardPhotos) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // The finishes not on screen: first photo of each straight away, then the
        // second, one wave at a time so the waves don't slow each other down.
        const others = MATERIAL_FILTERS.filter((f) => f.value !== filterRef.current).map((f) =>
          PROFESSIONAL_PHOTOS.filter((p) => p.material === f.value)
        );
        const fetchWave = (index: number) => {
          const urls = others.map((photos) => photos[index]?.image).filter((url): url is string => !!url);
          if (urls.length === 0) return;
          let pending = urls.length;
          urls.forEach((url) => {
            const img = new Image();
            img.fetchPriority = 'low';
            img.decoding = 'async';
            img.onload = img.onerror = () => {
              if (--pending === 0 && index < 1) fetchWave(index + 1);
            };
            img.src = url;
          });
        };
        fetchWave(0);
      },
      { rootMargin: '100% 0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [isMobile, cardPhotos]);
  const photos =
    cardPhotos ?? (isMobile && filter ? PROFESSIONAL_PHOTOS.filter((p) => p.material === filter) : PROFESSIONAL_PHOTOS);

  const { ref: headingRef, style: headingStyle } = useReveal<HTMLHeadingElement>();

  return (
    <RevealSection ref={sectionRef} className="border-t border-[rgba(255,255,255,.06)] bg-bg-alt px-[clamp(20px,4vw,48px)] py-[clamp(90px,13vh,150px)]">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-[clamp(40px,5vh,64px)] flex flex-wrap items-end justify-between gap-5">
          <h2
            ref={headingRef}
            style={headingStyle}
            className="m-0 font-manrope text-[clamp(34px,5vw,68px)] font-bold leading-[.96] max-md:leading-[1.06] tracking-[-.032em]"
          >
            {heading ?? (
              <>
                TRUSTED ACROSS
                <br />
                INDUSTRIES.
              </>
            )}
          </h2>
          <div className="flex max-w-[420px] flex-wrap gap-2">
            {PROFESSIONAL_CHIPS.map((chip) => (
              <Chip key={chip} label={chip} />
            ))}
          </div>
        </div>

        {isMobile ? (
          <PhotoCarousel
            key={cardPhotos ? 'card' : (filter ?? 'all')}
            id={cardPhotos ? 'card' : (filter ?? 'all')}
            photos={photos}
            positions={positions}
          />
        ) : (
          <PhotoGrid photos={photos} />
        )}

        {isMobile && !cardPhotos && <FilterPills active={filter} onChange={setFilter} />}
      </div>
    </RevealSection>
  );
}

function FilterPills({
  active,
  onChange,
}: {
  active: PhotoMaterial | null;
  onChange: (value: PhotoMaterial | null) => void;
}) {
  const activeIndex = active ? MATERIAL_FILTERS.findIndex((f) => f.value === active) : -1;

  return (
    <div className="relative mt-8 grid max-w-[380px] grid-cols-3 rounded-full border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.03)] p-1">
      {activeIndex >= 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-[#F3F0EA] transition-transform duration-300 ease-lux"
          style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${activeIndex * 100}%)` }}
        />
      )}
      {MATERIAL_FILTERS.map((f) => {
        const selected = active === f.value;
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : f.value)}
            className="relative z-10 flex items-center justify-center whitespace-nowrap rounded-full py-2.5 text-[13.5px] font-medium transition-colors duration-300"
            style={{ color: selected ? '#0B0B0D' : 'rgba(243,240,234,.6)' }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// Desktop grid. It always starts collapsed to its first three rows, with the
// third row faded and blurred behind a "View More" button; the button expands
// it smoothly. State is deliberately not persisted anywhere, so a refresh
// starts collapsed, and it also collapses itself once the user scrolls away.
function PhotoGrid({ photos }: { photos: ProfessionalPhoto[] }) {
  const reducedMotion = useReducedMotion();
  const clipRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const viewMoreRef = useRef<HTMLButtonElement>(null);
  const lessRef = useRef<HTMLDivElement>(null);
  const collapsing = useRef<(() => void) | null>(null);
  const skipMotion = useRef(false);
  const preloaded = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<{ collapsed: number; full: number; row: number } | null>(null);
  const collapsible = photos.length > COLLAPSED_COUNT;
  const animate = !reducedMotion && !skipMotion.current;

  // Measure the collapsed (first three rows) and full heights before paint so
  // the grid never flashes fully open, and keep them right as the width changes.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !collapsible) return;
    const measure = () => {
      const lastVisible = grid.children[COLLAPSED_COUNT - 1] as HTMLElement | undefined;
      if (!lastVisible) return;
      const next = {
        collapsed: lastVisible.offsetTop + lastVisible.offsetHeight,
        full: grid.scrollHeight,
        row: lastVisible.offsetHeight,
      };
      setHeights((prev) =>
        prev && prev.collapsed === next.collapsed && prev.full === next.full && prev.row === next.row ? prev : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [collapsible]);

  // Once expanded, scrolling away from the grid puts it back to its default
  // state. The collapse waits for scrolling to settle (so it never fights
  // smooth-scroll momentum) and happens instantly and invisibly; if the grid
  // is above the viewport, the scroll position is shifted by the height that
  // was removed so nothing on screen moves.
  useEffect(() => {
    const clip = clipRef.current;
    if (!expanded || !clip) return;
    let poll: number | undefined;
    const stopPolling = () => {
      if (poll !== undefined) {
        window.clearInterval(poll);
        poll = undefined;
      }
    };

    const collapseSilently = () => {
      const above = clip.getBoundingClientRect().bottom <= 0;
      const before = clip.offsetHeight;
      skipMotion.current = true;
      flushSync(() => setExpanded(false));
      skipMotion.current = false;
      if (above) window.scrollBy({ top: clip.offsetHeight - before, behavior: 'instant' });
    };

    const observer = new IntersectionObserver(([entry]) => {
      stopPolling();
      if (entry.isIntersecting) return;
      let lastY = window.scrollY;
      poll = window.setInterval(() => {
        if (window.scrollY !== lastY) {
          lastY = window.scrollY;
          return;
        }
        stopPolling();
        if (!collapsing.current) collapseSilently();
      }, 150);
    });
    observer.observe(clip);
    return () => {
      observer.disconnect();
      stopPolling();
    };
  }, [expanded]);

  // The hidden rows are lazy-loaded; fetch them as soon as the button is
  // approached so they're ready by the time the rows open.
  const preloadRest = () => {
    if (preloaded.current) return;
    preloaded.current = true;
    photos.slice(COLLAPSED_COUNT).forEach((photo) => {
      if (photo.image) new Image().src = photo.image;
    });
  };

  const expand = () => {
    preloadRest();
    setExpanded(true);
    clipRef.current?.focus({ preventScroll: true });
  };

  // "Show less": one continuous motion. The grid's height and the page scroll
  // are both driven from this single frame loop with the same easing, so the
  // page never shrinks out from under the scroll position (which made the
  // browser clamp it and the page lurch). Scrolling goes through Lenis when it
  // is running, so its inertia can't fight this. The scroll lands with the
  // collapsed grid's bottom edge, and its "View More" button, in view.
  const collapse = () => {
    if (collapsing.current) return;
    const clip = clipRef.current;
    const less = lessRef.current;
    const done = () => {
      setExpanded(false);
      requestAnimationFrame(() => viewMoreRef.current?.focus({ preventScroll: true }));
    };
    if (!clip || !heights) {
      done();
      return;
    }

    const lenis = getLenis();
    const fromHeight = clip.offsetHeight;
    const toHeight = heights.collapsed;
    const lessHeight = less?.offsetHeight ?? 0;
    const lessMargin = less ? parseFloat(getComputedStyle(less).marginTop) || 0 : 0;
    const startY = window.scrollY;
    const clipTop = clip.getBoundingClientRect().top + startY;
    const viewport = window.innerHeight;
    const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 80;
    const endMaxY = document.documentElement.scrollHeight - (fromHeight - toHeight) - lessHeight - lessMargin - viewport;
    // Land with the collapsed grid's bottom a comfortable distance above the
    // viewport's bottom edge, but never scroll the grid's top under the nav,
    // never scroll down, and never past what the shorter page allows.
    const bottomGap = Math.min(160, viewport * 0.2);
    const wanted = clipTop + toHeight - viewport + bottomGap;
    const targetY = Math.max(0, Math.min(startY, Math.max(wanted, clipTop - navHeight - 24), endMaxY));

    const apply = (progress: number) => {
      clip.style.transition = 'none';
      clip.style.height = `${fromHeight + (toHeight - fromHeight) * progress}px`;
      if (less) {
        less.style.overflow = 'hidden';
        less.style.height = `${lessHeight * (1 - progress)}px`;
        less.style.marginTop = `${lessMargin * (1 - progress)}px`;
        less.style.opacity = String(1 - progress);
      }
      const y = startY + (targetY - startY) * progress;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: 'instant' });
    };

    let frame = 0;
    const stopEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    const finish = () => {
      cancelAnimationFrame(frame);
      stopEvents.forEach((name) => window.removeEventListener(name, finish));
      collapsing.current = null;
      apply(1);
      done();
    };
    collapsing.current = finish;

    if (reducedMotion) {
      finish();
      return;
    }
    // If the person scrolls or presses a key mid-collapse, settle at the end
    // state immediately instead of fighting their input.
    stopEvents.forEach((name) => window.addEventListener(name, finish, { passive: true, once: true }));
    // Freeze any Lenis wheel inertia still gliding from just before the click.
    if (lenis) lenis.scrollTo(startY, { immediate: true, force: true });
    const duration = Math.min(
      COLLAPSE_MAX_MS,
      Math.max(COLLAPSE_MIN_MS, Math.max(Math.abs(startY - targetY), fromHeight - toHeight) * COLLAPSE_MS_PER_PX)
    );
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      if (t >= 1) {
        finish();
        return;
      }
      apply(t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease-in-out cubic
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  return (
    <div>
      <div
        ref={clipRef}
        id="portfolio-grid"
        tabIndex={-1}
        className="relative overflow-hidden outline-none"
        style={{
          height: collapsible && heights ? (expanded ? heights.full : heights.collapsed) : undefined,
          transition: animate ? `height ${EXPAND_MS}ms cubic-bezier(.16,1,.3,1)` : 'none',
        }}
      >
        <div ref={gridRef} className="relative grid grid-cols-3 gap-4">
          {photos.map((photo, i) => (
            i < COLLAPSED_COUNT ? (
              <PhotoCard key={photo.caption} photo={photo} index={i % GRID_COLUMNS} />
            ) : (
              <ExpandRevealCard
                key={photo.caption}
                photo={photo}
                shown={expanded}
                delayMs={(i % GRID_COLUMNS) * 80 + Math.floor((i - COLLAPSED_COUNT) / GRID_COLUMNS) * 90}
              />
            )
          ))}
        </div>

        {collapsible && heights && (
          <div
            aria-hidden={expanded}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center"
            style={{
              // Only a band along the bottom of the third row, not the whole
              // row; the button is centered inside it.
              height: Math.min(heights.row, Math.max(OVERLAY_MIN_PX, Math.round(heights.row * OVERLAY_ROW_FRACTION))),
              opacity: expanded ? 0 : 1,
              pointerEvents: expanded ? 'none' : 'auto',
              visibility: expanded ? 'hidden' : 'visible',
              transition: animate
                ? `opacity ${FADE_MS}ms ease-out, visibility 0s linear ${expanded ? `${FADE_MS}ms` : '0s'}`
                : 'none',
            }}
          >
            {/* progressive blur: clear along the top of the row, fully blurred at the bottom */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-b-2xl"
              style={{
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, #000 55%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 55%)',
              }}
            />
            {/* fade toward the section background (bg-alt) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(10,10,12,0) 0%, rgba(10,10,12,.6) 50%, rgba(10,10,12,.94) 100%)',
              }}
            />
            <button
              ref={viewMoreRef}
              type="button"
              aria-expanded={expanded}
              aria-controls="portfolio-grid"
              onClick={expand}
              onPointerEnter={preloadRest}
              onFocus={preloadRest}
              className="relative z-10 inline-flex items-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
            >
              View More
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {collapsible && expanded && (
        <div ref={lessRef} className="mt-9 flex justify-center">
          <button
            type="button"
            aria-controls="portfolio-grid"
            aria-expanded={expanded}
            onClick={collapse}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,.14)] px-7 py-[13px] text-[14px] font-medium text-ivory transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            Show less
            <ChevronUp size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

const DOT_COUNT = 3;
const DOT_REST_PX = 6;
const DOT_ACTIVE_PX = 22;
const SNAP_MS = 300;
const SNAP_EASE = 'cubic-bezier(.22,.9,.3,1)'; // decelerates to a stop, never overshoots
const AXIS_LOCK_PX = 8; // movement before we decide whether the gesture is horizontal or vertical
const SWIPE_FRACTION = 0.2; // drag further than this share of the width to change slide
const FLICK_PX_PER_MS = 0.35; // ...or release faster than this

type CarouselDrag = {
  active: boolean;
  locked: boolean;
  startX: number;
  startY: number;
  dx: number;
  samples: { x: number; t: number }[];
};

// Mobile carousel. It is driven by pointer events and a CSS transform instead
// of native overflow scrolling + scroll-snap, on purpose: native touch
// scrolling adds platform momentum and edge rubber-banding (iOS especially)
// that can't be switched off from CSS, which read as a loose, springy
// container. Here the track follows the finger 1:1, moves exactly one slide
// per swipe, eases to a stop in SNAP_MS with no overshoot, and is clamped at
// both ends. Vertical gestures are left to the browser (touch-action: pan-y),
// so the page still scrolls normally over it.
//
// It is remounted per finish (keyed by `id`) and each finish remembers its own
// slide in `positions`. Scroll progress is painted straight to the DOM, so
// nothing re-renders while dragging.
function PhotoCarousel({
  id,
  photos,
  positions,
}: {
  id: string;
  photos: ProfessionalPhoto[];
  positions: MutableRefObject<Record<string, number>>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const index = useRef(0);
  const width = useRef(0);
  const drag = useRef<CarouselDrag>({ active: false, locked: false, startX: 0, startY: 0, dx: 0, samples: [] });
  const [visible, setVisible] = useState(false);
  const [near, setNear] = useState(0); // slide on screen; it and its neighbours load eagerly
  // Once the carousel is about a screen away, every photo of this finish loads
  // eagerly (a finish is ~30 small WebPs), so any slide swiped to is already
  // there. Left to native lazy-loading, off-screen slides in the transformed
  // track only start fetching once swiped into view, which showed as a
  // few-second blank on everything past the first few photos.
  const [warm, setWarm] = useState(false);
  // The prerendered HTML can't tell a phone from a desktop, so it leaves every
  // photo lazy; the eager/priority hints only go on once hydration is done
  // (on phones, the same moment this carousel used to first render), so the
  // HTML never starts photo downloads that the old first render didn't.
  const hydrated = useHydrated();
  const count = photos.length;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setWarm(true);
        observer.disconnect();
      },
      { rootMargin: '100% 0px' }
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // Positions the track (and the three dots) for `index` plus a live drag
  // offset in px; `animate` eases there, otherwise it is applied instantly.
  const paint = useCallback(
    (offset: number, animate: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = animate ? `transform ${SNAP_MS}ms ${SNAP_EASE}` : 'none';
      track.style.transform = `translate3d(${-index.current * width.current + offset}px,0,0)`;

      const slidePos = width.current > 0 ? index.current - offset / width.current : index.current;
      const progress = count > 1 ? Math.min(1, Math.max(0, slidePos / (count - 1))) : 0;
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        const closeness = Math.max(0, 1 - Math.abs(progress * (DOT_COUNT - 1) - i));
        dot.style.transition = animate ? `width ${SNAP_MS}ms ${SNAP_EASE}, background-color ${SNAP_MS}ms ease` : 'none';
        dot.style.width = `${DOT_REST_PX + (DOT_ACTIVE_PX - DOT_REST_PX) * closeness}px`;
        dot.style.backgroundColor = `color-mix(in srgb, #FDD303 ${Math.round(closeness * 100)}%, rgba(255,255,255,.2))`;
      });
    },
    [count]
  );

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(count - 1, Math.max(0, next));
      if (clamped !== index.current) {
        index.current = clamped;
        positions.current[id] = clamped;
        setNear(clamped);
      }
      paint(0, true);
    },
    [count, id, paint, positions]
  );

  // Restore this finish's saved slide before paint (instantly), keep the
  // track sized to the container, then fade in.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    index.current = Math.min(count - 1, positions.current[id] ?? 0);
    setNear(index.current);
    const measure = () => {
      width.current = viewport.clientWidth;
      paint(0, false);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [id, count, paint, positions]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { active: true, locked: false, startX: e.clientX, startY: e.clientY, dx: 0, samples: [{ x: e.clientX, t: e.timeStamp }] };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    let dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.locked) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        d.active = false; // a vertical scroll: leave it to the browser
        return;
      }
      d.locked = true;
      viewportRef.current?.setPointerCapture(e.pointerId);
    }
    // Hard stop at both ends: no drag past the first or last photo.
    if ((index.current === 0 && dx > 0) || (index.current === count - 1 && dx < 0)) dx = 0;
    d.dx = dx;
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    paint(dx, false);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    const wasDragging = d.active && d.locked;
    d.active = false;
    if (!wasDragging) return;
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);

    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0; // px/ms, negative = leftward
    const far = Math.abs(d.dx) > width.current * SWIPE_FRACTION;
    const flick = Math.abs(velocity) > FLICK_PX_PER_MS && Math.sign(velocity) === Math.sign(d.dx);
    // One slide per swipe, however hard the flick.
    if (!cancelled && (far || flick)) goTo(index.current + (d.dx < 0 ? 1 : -1));
    else paint(0, true);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') goTo(index.current + 1);
    else if (e.key === 'ArrowLeft') goTo(index.current - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div
        ref={viewportRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Portfolio photos"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onKeyDown={onKeyDown}
        onDragStart={(e) => e.preventDefault()}
        className="-mx-[clamp(20px,4vw,48px)] touch-pan-y select-none overflow-hidden outline-none transition-opacity duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div ref={trackRef} className="flex will-change-transform">
          {photos.map((photo, i) => (
            <div key={photo.caption} className="w-full shrink-0 px-[clamp(20px,4vw,48px)]">
              {/* No per-card staggered reveal here: the carousel fades in as
                  a whole, and an index-based delay left later slides blank
                  for seconds (slide 20 waited 1.6s, then 0.9s to fade). */}
              <PhotoFrame
                photo={photo}
                eager={hydrated && (warm || Math.abs(i - near) <= 2)}
                priority={hydrated && i === near}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Three dots however many photos there are: the highlight glides from
          the first to the last dot as the gallery moves. */}
      <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-2">
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            className="block h-[6px] rounded-full"
            style={{ width: DOT_REST_PX, backgroundColor: 'rgba(255,255,255,.2)' }}
          />
        ))}
      </div>
    </div>
  );
}

// `eager`/`priority` are for the mobile carousel: the slide on screen (and the
// next couple) load right away instead of waiting for lazy-loading to notice
// them, so a finish switch or a swipe doesn't sit on an empty frame.
type PhotoLoading = { eager?: boolean; priority?: boolean };

function PhotoCard({ photo, index = 0, eager, priority }: { photo: ProfessionalPhoto; index?: number } & PhotoLoading) {
  const { ref, style } = useReveal<HTMLDivElement>(index * 80);
  return <PhotoFrame photo={photo} frameRef={ref} style={style} eager={eager} priority={priority} />;
}

// Same rise + fade + scale-in as useReveal (same timings), but driven by the
// grid being expanded rather than by a one-shot scroll observer, so the rows
// behind "View More" animate in every time it is opened. Collapsing resets
// them (instantly, out of sight behind the clip) ready for the next open.
function ExpandRevealCard({ photo, shown, delayMs }: { photo: ProfessionalPhoto; shown: boolean; delayMs: number }) {
  const reduced = useReducedMotion();
  const style: CSSProperties = reduced
    ? {}
    : shown
      ? {
          opacity: 1,
          transform: 'none',
          transition: 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)',
          transitionDelay: `${delayMs}ms`,
          willChange: 'opacity, transform',
        }
      : { opacity: 0, transform: 'translateY(34px) scale(.98)', transition: 'none', willChange: 'opacity, transform' };
  return <PhotoFrame photo={photo} style={style} />;
}

function PhotoFrame({
  photo,
  frameRef,
  style,
  eager,
  priority,
}: {
  photo: ProfessionalPhoto;
  frameRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
} & PhotoLoading) {
  return (
    <div
      ref={frameRef}
      style={style}
      className="relative aspect-square overflow-hidden rounded-2xl border border-[rgba(255,255,255,.07)]"
    >
      {photo.image ? (
        <img
          src={photo.image}
          alt={photo.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full items-end p-5"
          style={{ background: 'repeating-linear-gradient(45deg, #15151A 0 14px, #101015 14px 28px)' }}
        >
          <span className="whitespace-pre-line font-inter text-[9.5px] leading-[1.7] tracking-[.1em] text-grey-1">
            {photo.caption}
          </span>
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[rgba(255,255,255,.1)] px-3.5 py-2 font-inter text-[10px] tracking-[.14em] text-grey-1">
      {label}
    </span>
  );
}
