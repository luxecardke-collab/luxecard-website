import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { CARD_PAGES, cardPageFor } from '../data/cardPages';
import { NAV_LINKS } from '../data/content';
import { useContactModal } from '../context/contactModalContext';
import { useInquiryModal } from '../context/inquiryModalContext';
import { useCart } from '../context/cartContext';
import { useNavMenu } from '../context/navMenuContext';
import { usePagePath } from '../context/pagePathContext';
import { useHydrated } from '../hooks/useHydrated';
import { useInert } from '../hooks/useInert';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useResolveNavHref } from '../utils/navHref';
import { scrollToSection } from '../utils/scrollToSection';

export function Nav() {
  const { isOpen: menuOpen, toggle: toggleMenu, close: closeMenu } = useNavMenu();
  // Closed, the dropdown is already hidden with CSS (opacity/pointer-events),
  // but that alone doesn't stop Tab from reaching its links; inert does.
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useInert(mobileMenuRef, menuOpen);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  // Opening the order form or contact popup from inside this dropdown also
  // closes the dropdown, which makes its own "Order Your LuxeCard"/"Contact
  // Us" button inert a moment later. Moving focus to the always-visible
  // toggle button first means the dialog captures IT as "what had focus", so
  // closing the dialog returns focus somewhere still real and visible,
  // instead of onto a button that's since become unreachable.
  const returnFocusToToggle = () => menuToggleRef.current?.focus();
  const wide = useMediaQuery('(min-width: 900px)');
  const reduced = useReducedMotion();
  const { open: openInquiryModal, preload: preloadInquiryModal } = useInquiryModal();
  const { open: openContactModal, preload: preloadContactModal } = useContactModal();
  const { open: openCart, preloadDrawer, totalCount, isOpen: cartOpen } = useCart();
  const resolveNavHref = useResolveNavHref();
  // On a card page the order buttons go to that page's own order form.
  const onCardPage = !!cardPageFor(usePagePath());
  const orderNow = () => {
    if (onCardPage) {
      const form = document.getElementById('order');
      if (form) scrollToSection(form);
    } else {
      openInquiryModal('individual');
    }
  };
  // The cart is restored from localStorage, which the prerendered HTML can't
  // know about, so its count only shows once hydration is done.
  const cartCount = useHydrated() ? totalCount : 0;

  useEffect(() => {
    if (wide) closeMenu();
  }, [wide, closeMenu]);

  const scrollToId = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) scrollToSection(target);
  }, []);

  // The mobile dropdown's own links: unlike the desktop links (handled by
  // SmoothScroll's shared, document-level click listener), these wait for
  // the menu to actually finish collapsing before measuring anything, since
  // closeMenu()'s state update hasn't painted yet at click time — measuring
  // immediately would read the nav's height while the open dropdown is
  // still part of it, inflating the offset and landing short of the target
  // (exactly the "lands above the section" bug this replaces).
  const handleMobileNavClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, resolvedHref: string) => {
      // A cross-page link (e.g. from the affiliate page, resolveNavHref
      // returns "/#products") needs a real navigation, not a scroll.
      if (!resolvedHref.startsWith('#')) return;
      e.preventDefault();
      // Stops this click from also reaching SmoothScroll's document-level
      // listener, which would otherwise scroll immediately (before the
      // menu has closed) using its own scroll-margin-based offset.
      e.stopPropagation();
      closeMenu();
      const id = resolvedHref.slice(1);

      if (reduced) {
        scrollToId(id);
        return;
      }
      const panel = mobileMenuRef.current;
      // Safety net in case the transition is interrupted or never fires.
      const fallbackId = window.setTimeout(() => {
        panel?.removeEventListener('transitionend', onTransitionEnd);
        scrollToId(id);
      }, 700);
      function onTransitionEnd(ev: TransitionEvent) {
        if (ev.propertyName !== 'grid-template-rows') return;
        panel?.removeEventListener('transitionend', onTransitionEnd);
        window.clearTimeout(fallbackId);
        scrollToId(id);
      }
      panel?.addEventListener('transitionend', onTransitionEnd);
    },
    [closeMenu, reduced, scrollToId],
  );

  // The bar's contents (logo, links, buttons) stay hidden until the logo is
  // decoded, then fade in together on the hero text's curve and delay, so the
  // logo never pops in after the rest of the nav. The logo is preloaded from
  // index.html, so this is normally immediate; the timeout means a slow or
  // failed logo can never hold the nav back for long.
  const logoRef = useRef<HTMLImageElement>(null);
  const [logoReady, setLogoReady] = useState(false);
  const markLogoReady = useCallback(() => setLogoReady(true), []);
  useEffect(() => {
    const img = logoRef.current;
    if (img?.complete) img.decode().then(markLogoReady, markLogoReady);
    const fallback = window.setTimeout(markLogoReady, 1500);
    return () => window.clearTimeout(fallback);
  }, [markLogoReady]);

  return (
    <nav
      className="fixed inset-x-0 top-0 z-[90]"
      style={{
        // A lighter frosted-glass blur than the original blur(18px)
        // saturate(140%): plain blur, no saturate, and a smaller radius —
        // close to the same look, cheaper to keep live on every scroll frame.
        background: 'rgba(8,8,10,.82)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        // Dimmed instead of reblurred while the cart is open — cheaper, and
        // the bar is already translucent, so there's little left to gain by
        // changing its blur radius too.
        opacity: cartOpen ? 0.5 : 1,
        transition: 'opacity 550ms cubic-bezier(.65,0,.35,1)',
      }}
    >
      <div
        className={
          wide
            ? 'mx-auto grid h-[var(--nav-h)] max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-[clamp(20px,4vw,48px)]'
            : 'mx-auto flex h-[var(--nav-h)] max-w-[1320px] items-center justify-between gap-6 px-[clamp(20px,4vw,48px)]'
        }
        style={{
          opacity: logoReady ? 1 : 0,
          transition: reduced ? 'none' : 'opacity 1.1s 80ms cubic-bezier(.16,1,.3,1)',
        }}
      >
        <a href={resolveNavHref('#top')} className="flex items-center">
          <img
            ref={logoRef}
            onLoad={(e) => e.currentTarget.decode().then(markLogoReady, markLogoReady)}
            onError={markLogoReady}
            fetchPriority="high"
            src="/images/luxecard-logo.webp"
            alt="LuxeCard"
            width={534}
            height={100}
            className="h-7 w-auto sm:h-8"
          />
        </a>

        {wide ? (
          <>
            <div className="flex items-center justify-self-center gap-[clamp(20px,3vw,40px)] text-sm text-[rgba(243,240,234,.68)]">
              {NAV_LINKS.map((link) =>
                link.href === '#products' ? (
                  <CardsDropdown key={link.href} seeAllHref={resolveNavHref(link.href)} />
                ) : (
                  <a key={link.href} href={resolveNavHref(link.href)} className="hover:text-accent">
                    {link.label}
                  </a>
                )
              )}
            </div>
            <div className="flex items-center justify-self-end gap-3">
              <CartButton onClick={openCart} onPreload={preloadDrawer} count={cartCount} />
              <button
                type="button"
                onClick={orderNow}
                onMouseEnter={onCardPage ? undefined : preloadInquiryModal}
                onFocus={onCardPage ? undefined : preloadInquiryModal}
                className="inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-[11px] text-[13.5px] font-semibold tracking-[.01em] text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
              >
                Order Your LuxeCard
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <CartButton onClick={openCart} onPreload={preloadDrawer} count={cartCount} />
            <button
              ref={menuToggleRef}
              type="button"
              onClick={toggleMenu}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="rounded-full border border-[rgba(255,255,255,.16)] px-4 py-[9px] font-inter text-[11px] font-medium tracking-[.13em] text-ivory"
            >
              {menuOpen ? 'CLOSE' : 'MENU'}
            </button>
          </div>
        )}
      </div>

      {!wide && (
        <div
          ref={mobileMenuRef}
          aria-hidden={!menuOpen}
          className="grid transition-[grid-template-rows] duration-[620ms]"
          style={{
            gridTemplateRows: menuOpen ? '1fr' : '0fr',
            pointerEvents: menuOpen ? 'auto' : 'none',
            transitionTimingFunction: 'cubic-bezier(.65,0,.35,1)',
          }}
        >
          <div className="overflow-hidden">
            <div
              className="flex flex-col gap-[18px] border-t border-[rgba(255,255,255,.08)] px-[clamp(20px,5vw,48px)] pb-7 pt-[18px] transition-[opacity,transform]"
              style={{
                background: '#08080A',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
                transitionDuration: '520ms',
                transitionTimingFunction: 'cubic-bezier(.65,0,.35,1)',
                transitionDelay: menuOpen ? '100ms' : '0ms',
              }}
            >
              <a
                href={resolveNavHref('#top')}
                onClick={(e) => handleMobileNavClick(e, resolveNavHref('#top'))}
                className="font-manrope text-[22px]"
              >
                Home
              </a>
              {NAV_LINKS.map((link) => {
                const resolvedHref = resolveNavHref(link.href);
                if (link.href === '#products') {
                  // The card pages, grouped, in place of "Products".
                  return (
                    <div key={link.href} className="flex flex-col gap-3">
                      <span className="font-inter text-[11px] font-medium tracking-[.14em] text-grey-1">CARDS</span>
                      <div className="flex flex-col gap-3 border-l border-[rgba(255,255,255,.1)] pl-4">
                        {CARD_PAGES.map((card) => (
                          <a key={card.path} href={card.path} className="font-manrope text-[19px]">
                            {card.name}
                          </a>
                        ))}
                        <a
                          href={resolvedHref}
                          onClick={(e) => handleMobileNavClick(e, resolvedHref)}
                          className="font-manrope text-[19px] text-[rgba(243,240,234,.6)]"
                        >
                          See all cards
                        </a>
                      </div>
                    </div>
                  );
                }
                return (
                  <a
                    key={link.href}
                    href={resolvedHref}
                    onClick={(e) => handleMobileNavClick(e, resolvedHref)}
                    className="font-manrope text-[22px]"
                  >
                    {link.label}
                  </a>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  returnFocusToToggle();
                  closeMenu();
                  openContactModal();
                }}
                onMouseEnter={preloadContactModal}
                onFocus={preloadContactModal}
                className="text-left font-manrope text-[22px]"
              >
                Contact Us
              </button>
              <button
                type="button"
                onClick={() => {
                  returnFocusToToggle();
                  closeMenu();
                  orderNow();
                }}
                onMouseEnter={onCardPage ? undefined : preloadInquiryModal}
                onFocus={onCardPage ? undefined : preloadInquiryModal}
                className="mt-1.5 rounded-full bg-ivory py-[15px] text-center font-semibold text-ink"
              >
                Order Your LuxeCard
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// Desktop "Cards" menu (in place of "Products"): the card pages, then the
// homepage's products section. Opens on hover or click; Escape, a click
// elsewhere or tabbing away closes it.
function CardsDropdown({ seeAllHref }: { seeAllHref: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useInert(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 hover:text-accent ${open ? 'text-accent' : ''}`}
      >
        Cards
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className="transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {/* The top padding keeps the hover area continuous from the button to the panel. */}
      <div
        ref={panelRef}
        aria-hidden={!open}
        className="absolute left-1/2 top-full z-[1] min-w-[200px] pt-3 transition-[opacity,transform] duration-300 ease-lux"
        style={{
          opacity: open ? 1 : 0,
          transform: `translateX(-50%) translateY(${open ? 0 : -6}px)`,
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div
          className="flex flex-col rounded-2xl border border-[rgba(255,255,255,.1)] p-2"
          style={{ background: 'rgba(12,12,14,.97)', boxShadow: '0 30px 60px -25px rgba(0,0,0,.8)' }}
        >
          {CARD_PAGES.map((card) => (
            <a
              key={card.path}
              href={card.path}
              className="rounded-xl px-4 py-2.5 text-ivory hover:bg-[rgba(255,255,255,.04)] hover:text-accent"
            >
              {card.name}
            </a>
          ))}
          <a
            href={seeAllHref}
            onClick={() => setOpen(false)}
            className="mt-1 border-t border-[rgba(255,255,255,.08)] px-4 pb-2.5 pt-3 text-[rgba(243,240,234,.6)] hover:text-accent"
          >
            See all cards
          </a>
        </div>
      </div>
    </div>
  );
}

function CartButton({
  onClick,
  onPreload,
  count,
}: {
  onClick: () => void;
  onPreload: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPreload}
      onFocus={onPreload}
      aria-label={`Open cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,.16)] text-ivory transition-colors duration-300 hover:border-accent hover:text-accent"
    >
      <ShoppingCart size={18} strokeWidth={1.6} aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-inter text-[10px] font-semibold text-ink"
        >
          {count}
        </span>
      )}
    </button>
  );
}
