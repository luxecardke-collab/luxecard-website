import { useEffect, useState, type RefObject } from 'react';

// The sample profile's code (components/SampleProfile) in its own file,
// fetched only when a section showing it comes within about a screen of
// view, so it never weighs on the page load. Once fetched it's kept here, so
// every later render (and the other section) has it straight away: no
// loading state, no blank screen.
type SampleProfileModule = typeof import('../components/SampleProfile');

let loaded: SampleProfileModule | null = null;
let loading: Promise<SampleProfileModule> | null = null;

function load(): Promise<SampleProfileModule> {
  loading ??= import('../components/SampleProfile').then((m) => (loaded = m));
  return loading;
}

/** The SampleProfile module once `ref`'s element is near the screen, else null. */
export function useSampleProfile(ref: RefObject<HTMLElement | null>): SampleProfileModule | null {
  const [mod, setMod] = useState<SampleProfileModule | null>(loaded);

  useEffect(() => {
    if (loaded) {
      setMod(loaded);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void load().then((m) => {
          if (!cancelled) setMod(m);
        });
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [ref]);

  return mod;
}
