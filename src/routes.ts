import { LEGAL_DOCS, type LegalDoc } from './data/legal';

// Pages are picked by URL path; there's no client-side router, so moving
// between pages is always a full page load.
export type Route =
  | { kind: 'home' }
  | { kind: 'affiliate' }
  | { kind: 'order-confirmation' }
  | { kind: 'legal'; doc: LegalDoc };

// "/affiliate/" and "/affiliate" are the same page.
export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function routeFor(path: string): Route {
  if (path === '/affiliate') return { kind: 'affiliate' };
  if (path === '/order-confirmation') return { kind: 'order-confirmation' };
  const doc = LEGAL_DOCS.find((d) => d.path === path);
  if (doc) return { kind: 'legal', doc };
  return { kind: 'home' };
}

// Identifies which page some prerendered HTML is, so main.tsx only hydrates
// markup that was rendered for the same page the browser is on.
export function routeKey(path: string): string {
  const route = routeFor(path);
  return route.kind === 'legal' ? route.doc.path : route.kind;
}
