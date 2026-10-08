import { LINKS } from '../data/links';

// "Secure payment by Paystack · M-Pesa, Airtel Money or card · Returns
// policy", under every checkout button (the cart, the card pages' form).
export function PaymentLine({ className = '' }: { className?: string }) {
  return (
    <p className={`m-0 text-center text-[11.5px] leading-[1.5] text-[rgba(243,240,234,.45)] ${className}`}>
      Secure payment by Paystack · M-Pesa, Airtel Money or card ·{' '}
      <a
        href={LINKS.LEGAL.returns}
        className="whitespace-nowrap underline decoration-[rgba(243,240,234,.3)] underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
      >
        Returns policy
      </a>
    </p>
  );
}
