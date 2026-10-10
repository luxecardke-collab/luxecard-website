import type { ReactNode } from 'react';
import { ChevronDown, Globe, LayoutGrid, Mail, MessageCircle, Phone, Smartphone, UserPlus } from 'lucide-react';

// A sample LuxeCard digital profile, in HTML/CSS, in the website's own
// colours. Everything in it is invented (Amara Wanjiru, Savannah & Co.) and
// nothing in it is clickable. Shown scrolling in the card pages' "What they
// see when you tap" (VCardShowcase) and, still, on the phone in How It Works.

export type ProfilePart = 'brand' | 'story' | 'actions' | 'contact' | 'qr' | 'inquiries' | 'add';

// A light, terracotta palette: a warm light-grey page, a white banner,
// charcoal text with a softer grey for labels, terracotta accents.
const BG = '#FAF8F5';
const BANNER = '#FFFFFF';
const ACCENT = '#C2603A';
const INK = '#1F1F1F';
const MUTED = '#6B6762';
const FIELD = '#F2F0ED';

// A decorative QR-style pattern (not scannable): the three finder squares and
// a fixed pseudo-random fill, the same on every render.
function DecorativeQr({ size }: { size: number }) {
  const n = 21;
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cells: ReactNode[] = [];
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const on = rand() > 0.52;
      if (!inFinder(x, y) && on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} aria-hidden="true" className="rounded-md bg-white">
      <g fill={INK}>
        {cells}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </g>
    </svg>
  );
}

function Avatar({ size }: { size: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-manrope font-bold"
      style={{ width: size, height: size, fontSize: size * 0.34, color: '#FFFFFF', background: `linear-gradient(140deg, #D2774F, ${ACCENT})`, border: `3px solid ${BG}` }}
    >
      AW
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
      {children}
      <span className="h-px flex-1" style={{ background: 'rgba(194,96,58,.45)' }} />
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: ACCENT, color: '#FFFFFF' }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] uppercase tracking-[.08em]" style={{ color: MUTED }}>
          {label}
        </span>
        <span className="block truncate text-[11.5px]" style={{ color: INK }}>
          {value}
        </span>
      </span>
    </div>
  );
}

function Field({ children, tall = false }: { children: string; tall?: boolean }) {
  return (
    <div
      className={`mb-2 rounded-[10px] px-3 text-[11px] ${tall ? 'h-16 pt-2.5' : 'flex h-9 items-center'}`}
      style={{ background: FIELD, color: 'rgba(31,31,31,.7)' }}
    >
      {children}
    </div>
  );
}

// The outline around a part picked from the features list.
function partClass(active: ProfilePart | null, part: ProfilePart) {
  return `rounded-xl transition-shadow duration-500 ${active === part ? 'shadow-[0_0_0_2px_#C2603A]' : 'shadow-none'}`;
}

export function SampleProfile({ active = null, hideQr = false }: { active?: ProfilePart | null; hideQr?: boolean }) {
  return (
    // sample-profile-plain: see index.css (no automatic email/phone links).
    <div className="sample-profile-plain pb-20 text-left font-inter" style={{ background: BG, color: INK }}>
      <div data-part="brand">
        {/* Banner with the logo and the language button */}
        <div className="relative flex h-[118px] items-center justify-center border-b border-[#EAE6E0]" style={{ background: BANNER }}>
          <span className="font-manrope text-[17px] font-extrabold tracking-[.14em]" style={{ color: INK }}>
            SAVANNAH &amp; CO.
          </span>
          <span
            className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold"
            style={{ borderColor: 'rgba(31,31,31,.2)', color: INK }}
          >
            EN <ChevronDown size={10} strokeWidth={2.4} aria-hidden="true" />
          </span>
        </div>
        <div className={`relative z-[1] mx-3 -mt-9 flex flex-col items-center px-2 pb-1 text-center ${partClass(active, 'brand')}`}>
          <Avatar size={76} />
          <div className="mt-2.5 font-manrope text-[17px] font-bold">Amara Wanjiru</div>
          <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            Head of Partnerships
          </div>
          <div className="text-[11px]" style={{ color: MUTED }}>
            Savannah &amp; Co.
          </div>
        </div>
      </div>

      <div data-part="story" className={`mx-3 mt-2 px-2 py-1.5 text-center ${partClass(active, 'story')}`}>
        <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>
          Building partnerships that last.
        </div>
        <div className="mt-3 text-[12px] font-bold">Savannah &amp; Co.</div>
        <p className="m-0 mt-1 text-[10.5px] leading-[1.55]" style={{ color: MUTED }}>
          Savannah &amp; Co. is an advisory firm helping growing East African businesses find the right partners. We
          connect founders with investors, suppliers and distributors, and stay with them as those partnerships grow.
        </p>
      </div>

      <div data-part="actions" className={`mx-auto mt-4 flex w-fit gap-4 p-2 ${partClass(active, 'actions')}`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: ACCENT, color: '#FFFFFF' }}>
          <Globe size={19} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white">
          <MessageCircle size={19} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <div data-part="contact" className={`mx-3 px-2 pb-1 ${partClass(active, 'contact')}`}>
        <SectionTitle>Contact</SectionTitle>
        {/* A zero-width space after the "@" stops iPhone browsers spotting an
            email address here (they'd underline it and the label); nothing
            visible changes. */}
        <ContactRow icon={<Mail size={14} strokeWidth={2} aria-hidden="true" />} label="Email" value={'amara@\u200Byourcompany.co.ke'} />
        <ContactRow icon={<Phone size={14} strokeWidth={2} aria-hidden="true" />} label="Phone" value="+254 7XX XXX XXX" />
        <ContactRow icon={<Smartphone size={14} strokeWidth={2} aria-hidden="true" />} label="Mobile" value="+254 7XX XXX XXX" />
      </div>

      <div data-part="qr" className={`mx-3 px-2 pb-2 ${partClass(active, 'qr')}${hideQr ? ' hidden' : ''}`}>
        <SectionTitle>QR Code</SectionTitle>
        <div className="flex items-center justify-center gap-4">
          <Avatar size={82} />
          <DecorativeQr size={88} />
        </div>
      </div>

      <div data-part="inquiries" className={`mx-3 px-2 pb-2 ${partClass(active, 'inquiries')}`}>
        <SectionTitle>Inquiries</SectionTitle>
        <Field>Your Name</Field>
        <Field>Email Address</Field>
        <Field>Enter Phone Number</Field>
        <Field tall>Type a message here…</Field>
        <div
          className="mt-1 flex h-9 items-center justify-center rounded-[10px] border text-[11.5px] font-semibold"
          style={{ borderColor: INK, color: INK }}
        >
          Send Message
        </div>
      </div>

      <div className="mt-6 text-center text-[10px]" style={{ color: MUTED }}>
        Made by LuxeCard
      </div>
    </div>
  );
}

// What floats over the profile on the phone: the round menu button and the
// "Add to contact" button pinned at the bottom of the screen.
export function ProfileOverlays({ active = null, menuTop = 132 }: { active?: ProfilePart | null; menuTop?: number }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute right-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg"
        style={{ top: menuTop, color: INK }}
      >
        <LayoutGrid size={16} strokeWidth={2} />
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-x-4 bottom-4 z-[2] flex h-10 items-center justify-center gap-2 rounded-full border text-[12px] font-semibold transition-shadow duration-500 ${
          active === 'add' ? 'shadow-[0_0_0_2px_#1F1F1F]' : ''
        }`}
        style={{ borderColor: ACCENT, color: '#FFFFFF', background: ACCENT }}
      >
        <UserPlus size={14} strokeWidth={2} /> Add to contact
      </span>
    </>
  );
}

export const PROFILE_BG = BG;
