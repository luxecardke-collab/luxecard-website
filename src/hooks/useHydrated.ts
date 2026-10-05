import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while rendering the prerendered HTML (at build time) and while the
 * browser hydrates it, true in every render after that. Anything that can
 * only be known in the browser (localStorage, the real viewport) and changes
 * markup has to wait for this, so hydration renders exactly what the
 * prerendered HTML contains; React re-renders with the real values straight
 * after.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
