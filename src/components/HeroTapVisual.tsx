import { useEffect, useRef } from 'react';
import { useHydrated } from '../hooks/useHydrated';
import { useMediaQuery } from '../hooks/useMediaQuery';

const VIDEO_SRC = '/videos/hero-tap-demo.mp4';
const POSTER_SRC = '/images/hero-tap-poster.webp';

// Both frames are always in the markup, and CSS shows the one for the
// current width, so the prerendered HTML lays the hero out exactly right on
// any screen. The <video> itself is only added after hydration, inside the
// frame that's showing: that way it starts loading exactly when it always
// has (straight away on desktop, after the page's load event on phones), and
// never because the prerendered HTML guessed the wrong frame.
export function HeroTapVisual() {
  const wide = useMediaQuery('(min-width: 900px)');
  const hydrated = useHydrated();
  const videoIn: 'frame' | 'phone' | null = hydrated ? (wide ? 'phone' : 'frame') : null;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Crossing the breakpoint swaps in a different <video> element, so
  // re-attach when it flips.
  useEffect(() => {
    if (!videoIn) return;
    const narrow = videoIn === 'frame';
    const video = videoRef.current;
    if (!video) return;
    // Belt-and-suspenders for autoplay: some browsers only honor a muted
    // autoplay if the property (not just the attribute) is set before play()
    // is attempted.
    video.muted = true;

    let onScreen = false;
    let sourceAttached = false;

    // Only play while the video is on screen and the tab is visible: it loops
    // forever, so left alone it keeps decoding video that nobody can see.
    const sync = () => {
      if (!sourceAttached) return;
      if (onScreen && !document.hidden) {
        video.play().catch(() => {
          // Autoplay was blocked; the video stays on its poster frame.
        });
      } else {
        video.pause();
      }
    };

    const attachSource = () => {
      if (sourceAttached) return;
      sourceAttached = true;
      video.src = VIDEO_SRC;
      video.load();
      sync();
    };

    // Mobile: the poster shows instantly, and the video itself doesn't start
    // downloading until the rest of the page has finished loading, so it
    // never competes with everything else for bandwidth on first paint.
    // Desktop: restored to exactly how it behaved before that deferral was
    // added — the video attaches and starts loading immediately, in step
    // with the shader and hero text, instead of popping in later on its own
    // once `load` fires.
    if (narrow) {
      if (document.readyState === 'complete') {
        attachSource();
      } else {
        window.addEventListener('load', attachSource, { once: true });
      }
    } else {
      attachSource();
    }

    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    });
    observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('load', attachSource);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [videoIn]);

  return (
    <div
      className="relative flex items-center justify-center pb-[72px] min-[900px]:ml-[clamp(40px,8vw,110px)] min-[900px]:py-[28px]"
      style={{ minHeight: 'clamp(420px,56vh,560px)' }}
    >
      <div
        className="absolute aspect-square w-[78%] rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(253,211,3,.13), transparent 62%)' }}
      />

      {/* plain video frame (below 900px) */}
      <div
        className="relative z-[2] overflow-hidden rounded-2xl min-[900px]:hidden"
        style={{
          width: 'clamp(280px,82vw,360px)',
          boxShadow: '0 40px 80px -35px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.08)',
        }}
      >
        <div className="relative aspect-[9/12] w-full bg-[#0C0C0F]">
          {videoIn === 'frame' && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              loop
              muted
              playsInline
              preload="none"
              poster={POSTER_SRC}
            />
          )}
        </div>
      </div>

      {/* phone (900px and up) */}
      <div
        className="relative z-[2] hidden rounded-[42px] p-[10px] min-[900px]:block"
        style={{
          width: 'clamp(238px,25vw,288px)',
          background: 'linear-gradient(160deg, #2A2A30, #101012 55%, #1C1C21)',
          boxShadow: '0 60px 100px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.07)',
        }}
      >
        <div className="relative flex aspect-[9/19.2] flex-col overflow-hidden rounded-[33px] bg-[#0C0C0F]">
          <div className="absolute inset-x-0 top-3 z-[5] flex justify-between px-[18px] font-inter text-[9px] text-[rgba(243,240,234,.5)]">
            <span>9:41</span>
            <span>LTE</span>
          </div>

          {videoIn === 'phone' && (
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="auto">
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
