import type { Offer } from '../../api/_lib/pricing';
import { createContext, useContext } from 'react';

export type CartItem = {
  id: string;
  name: string;
  subOption?: string;
  price: number;
  quantity: number;
};

export type NewCartItem = Omit<CartItem, 'id' | 'quantity'> & { quantity?: number };

// Filled in only by the business form when "I need an eTIMS tax invoice" is ticked.
export type EtimsDetails = { kraPin: string; businessName: string };

export type CustomerInfo = {
  name: string;
  email: string;
  phone: string;
  company: string;
  etims?: EtimsDetails;
  // Which order-form tab this was saved from. Lets the cart show
  // business-only controls (e.g. "Request a quote") without guessing from
  // other fields — both tabs have their own optional "company" field, so
  // that alone can't tell them apart.
  orderType?: 'individual' | 'business';
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  // `customer` (the order form's email/phone) only improves Meta's matching
  // of the AddToCart event; it's never stored by the cart.
  addItem: (item: NewCartItem, customer?: { email?: string; phone?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalCount: number;
  // At regular prices.
  subtotal: number;
  discount: number;
  totalPrice: number;
  // Which single discount applies (they never combine), and the offer on
  // right now by the server's clock, if any — the same calculation
  // checkout charges (computeTotals in api/_lib/pricing.ts).
  discountType: 'offer' | 'bulk' | null;
  offer: Offer | null;
  customerInfo: CustomerInfo | null;
  saveCustomerInfo: (info: CustomerInfo) => void;
  notify: (message: string, description?: string) => void;
  // The cart drawer's code is lazy-loaded rather than shipped in the main
  // bundle. `shouldLoadDrawer` flips on (and stays on) once it's needed —
  // opened, or preloaded — so App.tsx knows to actually render it.
  // `preloadDrawer` is a no-op the second time it's called, so it's safe to
  // wire up from a hover/focus handler on any trigger.
  shouldLoadDrawer: boolean;
  preloadDrawer: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
