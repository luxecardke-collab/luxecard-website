import { createContext, useContext } from 'react';

// The current page's normalized path ("/", "/affiliate", ...). Passed down
// from App rather than read from window.location, so the same components
// render at build time, when there is no window.
export const PagePathContext = createContext('/');

export function usePagePath(): string {
  return useContext(PagePathContext);
}
