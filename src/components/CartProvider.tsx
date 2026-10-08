import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CartContext, type CartItem, type CustomerInfo, type NewCartItem } from '../context/cartContext';
import { CART_STORAGE_KEY as STORAGE_KEY } from '../utils/cartStorage';
import { computeTotals, FINISH_PRICES_BY_LABEL, SUB_OPTIONS_BY_LABEL } from '../../api/_lib/pricing';
import { useOffer } from '../hooks/useOffer';
import { trackAddToCart } from '../utils/checkout';
import { Toast } from './Toast';

type PersistedState = { items: CartItem[]; customerInfo: CustomerInfo | null; droppedInvalidItem: boolean };

// True for a sub-option a finish can actually take right now (e.g. Metallic
// no longer offers Gold). A saved cart from before a sub-option was removed
// would otherwise carry it straight through to checkout.
function hasValidSubOption(item: CartItem): boolean {
  const allowed = SUB_OPTIONS_BY_LABEL[item.name];
  return allowed ? typeof item.subOption === 'string' && allowed.includes(item.subOption) : !item.subOption;
}

function loadInitialState(): PersistedState {
  const empty: PersistedState = { items: [], customerInfo: null, droppedInvalidItem: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const rawItems: CartItem[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    const customerInfo: CustomerInfo | null = Array.isArray(parsed) ? null : (parsed?.customerInfo ?? null);
    const items = rawItems.filter(hasValidSubOption);
    return { items, customerInfo, droppedInvalidItem: items.length !== rawItems.length };
  } catch {
    // ignore malformed/unavailable storage
  }
  return empty;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // The offer on right now (if any) by the server's clock.
  const offer = useOffer();
  const initial = useRef<PersistedState | null>(null);
  if (!initial.current) initial.current = loadInitialState();

  const [items, setItems] = useState<CartItem[]>(initial.current.items);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(initial.current.customerInfo);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; description?: string } | null>(null);
  // The drawer's own code is lazy-loaded (see App.tsx); this just tracks
  // whether it's been requested yet, so it's rendered — and its chunk
  // fetched — no earlier than that.
  const [shouldLoadDrawer, setShouldLoadDrawer] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, customerInfo }));
    } catch {
      // ignore unavailable storage
    }
  }, [items, customerInfo]);

  useEffect(() => {
    // Paystack's cancel_action (set in api/checkout.ts) sends a cancelled
    // checkout back here with ?checkout=cancelled so the cart reopens
    // automatically instead of leaving the user stranded on the homepage.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') !== 'cancelled') return;
      setIsOpen(true);
      setShouldLoadDrawer(true);
      params.delete('checkout');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    } catch {
      // ignore unavailable history/location APIs
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timeout);
  }, [toast]);

  const open = useCallback(() => {
    setIsOpen(true);
    setShouldLoadDrawer(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const preloadDrawer = useCallback(() => setShouldLoadDrawer(true), []);

  const addItem = useCallback((newItem: NewCartItem, customer?: { email?: string; phone?: string }) => {
    // Outside the state updater so it fires once per add, even when React
    // (StrictMode) runs updaters twice.
    trackAddToCart({ name: newItem.name, price: newItem.price, quantity: newItem.quantity ?? 1 }, offer, customer);
    setItems((prev) => {
      const existing = prev.find((i) => i.name === newItem.name && i.subOption === newItem.subOption);
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + (newItem.quantity ?? 1) } : i,
        );
      }
      return [...prev, { ...newItem, id: crypto.randomUUID(), quantity: newItem.quantity ?? 1 }];
    });
  }, [offer]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, quantity } : i));
    });
  }, []);

  const saveCustomerInfo = useCallback((info: CustomerInfo) => setCustomerInfo(info), []);

  const notify = useCallback((message: string, description?: string) => setToast({ message, description }), []);

  // Runs once, after the first render, so it can use notify above.
  useEffect(() => {
    if (initial.current?.droppedInvalidItem) {
      notify('One item was removed from your cart', 'That option is no longer available. Please choose a current one instead.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The same totals calculation checkout uses, from the current price list
  // rather than the price stored when an item was added.
  const totals = useMemo(
    () =>
      computeTotals(
        items.map((i) => ({ price: FINISH_PRICES_BY_LABEL[i.name] ?? i.price, quantity: i.quantity })),
        offer
      ),
    [items, offer]
  );
  const { totalCount, subtotal, discount, total: totalPrice, discountType } = totals;

  const value = useMemo(
    () => ({
      items,
      isOpen,
      open,
      close,
      addItem,
      removeItem,
      updateQuantity,
      totalCount,
      subtotal,
      discount,
      totalPrice,
      discountType,
      offer,
      customerInfo,
      saveCustomerInfo,
      notify,
      shouldLoadDrawer,
      preloadDrawer,
    }),
    [
      items,
      isOpen,
      open,
      close,
      addItem,
      removeItem,
      updateQuantity,
      totalCount,
      subtotal,
      discount,
      totalPrice,
      discountType,
      offer,
      customerInfo,
      saveCustomerInfo,
      notify,
      shouldLoadDrawer,
      preloadDrawer,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <Toast message={toast?.message ?? null} description={toast?.description} />
    </CartContext.Provider>
  );
}
