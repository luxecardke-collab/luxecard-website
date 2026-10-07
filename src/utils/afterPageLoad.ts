// Runs `fn` once the page has finished loading and the browser is idle, so
// non-essential work never competes with the hero (its shader, video or
// text) for the network or the main thread.
export function afterPageLoad(fn: () => void) {
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 3000 });
    else setTimeout(fn, 1);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
