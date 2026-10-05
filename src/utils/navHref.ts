import { useCallback } from 'react';
import { usePagePath } from '../context/pagePathContext';
import { useHydrated } from '../hooks/useHydrated';

// Section anchors (e.g. "#products") only exist on the home page. From any
// other page, resolve them to an absolute "/#products" link instead so they
// navigate back home before jumping to the section; real paths like
// "/affiliate" pass through unchanged. The top of the home page is just "/",
// so "#top" resolves to a plain "/" (keeping any ?ref= tracking parameter)
// rather than "/#top".
export function resolveNavHref(href: string, pathname: string, search: string): string {
  if (!href.startsWith('#')) return href;
  if (pathname === '/') return href;
  return href === '#top' ? `/${search}` : `/${href}`;
}

// resolveNavHref for the current page. The query string only exists in the
// browser, so it's left off the prerendered HTML (and hydration) and added
// in the render straight after.
export function useResolveNavHref(): (href: string) => string {
  const pathname = usePagePath();
  const hydrated = useHydrated();
  const search = hydrated ? window.location.search : '';
  return useCallback((href: string) => resolveNavHref(href, pathname, search), [pathname, search]);
}
