import { useCallback, useSyncExternalStore } from 'react';

// The prerendered HTML (scripts/prerender.mjs) is rendered as if on a phone
// this wide, with no reduced-motion preference. main.tsx only hydrates it on
// screens that match (see HYDRATABLE_MEDIA); while it does, every media query
// answers as it would there, so hydration matches the HTML exactly. On every
// other render the answer is the browser's own.
const SERVER_VIEWPORT_WIDTH = 390;

// The screens the prerendered HTML is right for as-is. Anywhere else
// (tablets, desktops, reduced motion) hydrating it would mean React
// immediately re-rendering large parts of the page into their other layout —
// on desktop, in the same task that requests the hero shader, delaying it —
// so main.tsx renders those from scratch instead, exactly as before
// prerendering. Kept in step with SERVER_VIEWPORT_WIDTH: the widest phone
// layout breakpoint any component uses is max-width 767px.
export const HYDRATABLE_MEDIA = '(max-width: 767px) and (prefers-reduced-motion: no-preference)';

function serverMatches(query: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query);
  if (min) return SERVER_VIEWPORT_WIDTH >= Number(min[1]);
  const max = /\(max-width:\s*(\d+)px\)/.exec(query);
  if (max) return SERVER_VIEWPORT_WIDTH <= Number(max[1]);
  return false;
}

const lists = new Map<string, MediaQueryList>();
function mediaQueryList(query: string): MediaQueryList {
  let mql = lists.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    lists.set(query, mql);
  }
  return mql;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = mediaQueryList(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => mediaQueryList(query).matches,
    () => serverMatches(query)
  );
}
