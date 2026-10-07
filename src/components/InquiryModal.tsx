import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { sendCartLead } from '../utils/cartLead';
import {
  BUSINESS_NAME_ERROR,
  isValidKraPin,
  KRA_BUSINESS_NAME_MAX,
  KRA_PIN_ERROR,
  KRA_PIN_LENGTH,
  normalizeKraPin,
} from '../utils/kra';
import { readHoneypot } from '../utils/honeypot';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { HoneypotField } from './HoneypotField';
import type { InquiryTab } from '../context/inquiryModalContext';
import { useCart } from '../context/cartContext';
import { ETIMS_INVOICE_NOTE } from '../data/etims';
import { FINISH_PRICES_BY_LABEL } from '../../api/_lib/pricing';
import { useOffer } from '../hooks/useOffer';
import { offerPriceText } from '../utils/offerText';
import { syncServerClock } from '../utils/serverClock';
import { OfferBadge } from './OfferPrice';
import { Field } from './FormField';
import { inputClass } from '../utils/inputClass';

// Native <select> arrows can't be recolored directly — appearance:none plus
// a custom SVG chevron lets us force it white and position it with equal
// left/right breathing room, matched on both mobile and desktop.
const selectClass = (invalid?: boolean) => `${inputClass(invalid)} appearance-none bg-no-repeat pr-10`;

const selectChevronStyle: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 16px center',
  backgroundSize: '14px',
};

// Native <option> popups ignore most inline styling in some browsers, but
// explicit background/color is the standard best-effort way to keep the
// unselected option text legible against a dark theme.
const optionStyle: CSSProperties = { background: '#17171B', color: '#F3F0EA' };

type Finish = 'plastic' | 'wood' | 'metallic' | 'chairman' | '';

// Each row is independent and addressed only by its own id — no shared,
// finish-keyed state — so removing one finish can never affect another.
type FinishRow = {
  id: string;
  finish: Finish;
  subOption: string;
  quantity: number;
};

// Labels double as the cart item name and the key into the server's
// authoritative price list, so each finish's price is read from there rather
// than repeated here.
const FINISH_OPTIONS: { value: Exclude<Finish, ''>; label: string }[] = [
  { value: 'plastic', label: 'Plastic' },
  { value: 'wood', label: 'Wood' },
  { value: 'metallic', label: 'Metallic' },
  { value: 'chairman', label: "Chairman's Card" },
];

const FINISH_PRICES = Object.fromEntries(
  FINISH_OPTIONS.map((f) => [f.value, FINISH_PRICES_BY_LABEL[f.label]])
) as Record<Exclude<Finish, ''>, number>;

const SUB_OPTIONS: Partial<Record<Exclude<Finish, ''>, { value: string; label: string }[]>> = {
  wood: [
    { value: 'natural', label: 'Natural' },
    { value: 'black', label: 'Black' },
  ],
  // Gold is the Chairman's Card's own finish, not a Metallic sub-option.
  metallic: [
    { value: 'silver', label: 'Silver' },
    { value: 'black', label: 'Black' },
  ],
};

function createRow(): FinishRow {
  return { id: crypto.randomUUID(), finish: '', subOption: '', quantity: 1 };
}

// Factories (not shared static objects) so every reset creates its own
// fresh row array — no accidental reference sharing between the two forms.
function individualInitialState() {
  return { fullName: '', title: '', company: '', email: '', phone: '', rows: [createRow()] };
}

function businessInitialState() {
  return {
    organization: '',
    contactName: '',
    email: '',
    phone: '',
    rows: [createRow()],
    message: '',
    needsEtims: false,
    kraPin: '',
    kraBusinessName: '',
  };
}

type IndividualForm = ReturnType<typeof individualInitialState>;
type BusinessForm = ReturnType<typeof businessInitialState>;

function isRowComplete(row: FinishRow): boolean {
  if (!row.finish || row.quantity <= 0) return false;
  const subOptions = SUB_OPTIONS[row.finish];
  return !subOptions || !!row.subOption;
}

function leadItems(rows: FinishRow[]) {
  return rows.map((row) => ({
    name: FINISH_OPTIONS.find((f) => f.value === row.finish)?.label ?? '',
    subOption: row.finish ? SUB_OPTIONS[row.finish]?.find((o) => o.value === row.subOption)?.label : undefined,
    quantity: row.quantity,
  }));
}

function addRow<T extends { rows: FinishRow[] }>(setForm: (updater: (prev: T) => T) => void) {
  setForm((prev) => ({ ...prev, rows: [...prev.rows, createRow()] }));
}

function removeRow<T extends { rows: FinishRow[] }>(setForm: (updater: (prev: T) => T) => void, id: string) {
  setForm((prev) => (prev.rows.length <= 1 ? prev : { ...prev, rows: prev.rows.filter((r) => r.id !== id) }));
}

function updateRow<T extends { rows: FinishRow[] }>(
  setForm: (updater: (prev: T) => T) => void,
  id: string,
  patch: Partial<FinishRow>
) {
  setForm((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}

export function InquiryModal({
  isOpen,
  preselectedTab,
  onClose,
}: {
  isOpen: boolean;
  preselectedTab: InquiryTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<InquiryTab>(preselectedTab);
  // Handles inert-while-closed, the Tab trap, Escape, and returning focus to
  // whatever opened the dialog; see useDialogA11y for details. Called first
  // so its own initial-focus effect runs before the per-tab one below it,
  // which then wins (focuses the right field, not just the first control).
  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, onClose);
  const individualFirstFieldRef = useRef<HTMLInputElement>(null);
  const businessFirstFieldRef = useRef<HTMLInputElement>(null);
  const { addItem, saveCustomerInfo, notify, customerInfo } = useCart();

  const [individualForm, setIndividualForm] = useState<IndividualForm>(individualInitialState);
  const [businessForm, setBusinessForm] = useState<BusinessForm>(businessInitialState);
  const [individualAttempted, setIndividualAttempted] = useState(false);
  const [businessAttempted, setBusinessAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) setTab(preselectedTab);
  }, [isOpen, preselectedTab]);

  // Prices here follow the server's clock (and any offer) as soon as the
  // form is open, without waiting for the page-load sync.
  useEffect(() => {
    if (isOpen) void syncServerClock();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !customerInfo) return;
    setIndividualForm((prev) => ({
      ...prev,
      fullName: prev.fullName || customerInfo.name,
      company: prev.company || customerInfo.company,
      email: prev.email || customerInfo.email,
      phone: prev.phone || customerInfo.phone,
    }));
    setBusinessForm((prev) => ({
      ...prev,
      contactName: prev.contactName || customerInfo.name,
      organization: prev.organization || customerInfo.company,
      email: prev.email || customerInfo.email,
      phone: prev.phone || customerInfo.phone,
      // Saved eTIMS details come back pre-filled, with the box ticked.
      needsEtims: prev.needsEtims || !!customerInfo.etims,
      kraPin: prev.kraPin || customerInfo.etims?.kraPin || '',
      kraBusinessName: prev.kraBusinessName || customerInfo.etims?.businessName || '',
    }));
  }, [isOpen, customerInfo]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const ref = tab === 'individual' ? individualFirstFieldRef : businessFirstFieldRef;
    const raf = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setIndividualForm((prev) => ({
          ...individualInitialState(),
          fullName: prev.fullName,
          company: prev.company,
          email: prev.email,
          phone: prev.phone,
        }));
        setBusinessForm((prev) => ({
          ...businessInitialState(),
          contactName: prev.contactName,
          organization: prev.organization,
          email: prev.email,
          phone: prev.phone,
        }));
        setIndividualAttempted(false);
        setBusinessAttempted(false);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const updateIndividual = <K extends keyof IndividualForm>(key: K, value: IndividualForm[K]) => {
    setIndividualForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBusiness = <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => {
    setBusinessForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleIndividualSubmit = (e: FormEvent) => {
    e.preventDefault();
    const hp = readHoneypot(e);
    setIndividualAttempted(true);
    const rows = individualForm.rows.filter(isRowComplete);
    if (!individualForm.fullName || !individualForm.email || !individualForm.phone || rows.length === 0) return;

    rows.forEach((row) => {
      addItem({
        name: FINISH_OPTIONS.find((f) => f.value === row.finish)?.label ?? '',
        subOption: row.finish ? SUB_OPTIONS[row.finish]?.find((o) => o.value === row.subOption)?.label : undefined,
        price: FINISH_PRICES[row.finish as Exclude<Finish, ''>],
        quantity: row.quantity,
      });
    });

    saveCustomerInfo({
      name: individualForm.fullName,
      email: individualForm.email,
      phone: individualForm.phone,
      company: individualForm.company,
      orderType: 'individual',
    });

    sendCartLead({
      type: 'individual',
      fullName: individualForm.fullName,
      jobTitle: individualForm.title,
      company: individualForm.company,
      email: individualForm.email,
      phone: individualForm.phone,
      items: leadItems(rows),
      hp,
    });

    notify('Added to cart!');
    onClose();
  };

  const handleBusinessSubmit = (e: FormEvent) => {
    e.preventDefault();
    const hp = readHoneypot(e);
    setBusinessAttempted(true);
    const rows = businessForm.rows.filter(isRowComplete);
    if (
      !businessForm.organization ||
      !businessForm.contactName ||
      !businessForm.email ||
      !businessForm.phone ||
      rows.length === 0 ||
      (businessForm.needsEtims && (!isValidKraPin(businessForm.kraPin) || !businessForm.kraBusinessName.trim()))
    )
      return;

    const etims = businessForm.needsEtims
      ? { kraPin: normalizeKraPin(businessForm.kraPin), businessName: businessForm.kraBusinessName.trim() }
      : null;

    rows.forEach((row) => {
      addItem({
        name: FINISH_OPTIONS.find((f) => f.value === row.finish)?.label ?? '',
        subOption: row.finish ? SUB_OPTIONS[row.finish]?.find((o) => o.value === row.subOption)?.label : undefined,
        price: FINISH_PRICES[row.finish as Exclude<Finish, ''>],
        quantity: row.quantity,
      });
    });

    saveCustomerInfo({
      name: businessForm.contactName,
      email: businessForm.email,
      phone: businessForm.phone,
      company: businessForm.organization,
      // Left out when unticked, which also clears details saved from an earlier order.
      etims: etims ?? undefined,
      orderType: 'business',
    });

    sendCartLead({
      type: 'business',
      fullName: businessForm.contactName,
      company: businessForm.organization,
      email: businessForm.email,
      phone: businessForm.phone,
      items: leadItems(rows),
      message: businessForm.message,
      ...(etims ? { needsEtims: true, kraPin: etims.kraPin, kraBusinessName: etims.businessName } : {}),
      hp,
    });

    notify('Added to cart!');
    onClose();
  };

  return (
    <div
      aria-hidden={!isOpen}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ease-lux min-[900px]:p-6"
      style={{
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        background: 'rgba(8,8,10,.82)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        backdropFilter: 'blur(14px) saturate(140%)',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'individual' ? 'Order your LuxeCard' : 'Equip your team'}
        className="relative max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-[rgba(255,255,255,.1)] p-[clamp(26px,4vw,42px)] shadow-2xl transition-transform duration-300 ease-lux"
        style={{
          background: 'radial-gradient(120% 100% at 50% 0%, #17171B 0%, #0C0C0E 60%)',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.97)',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,.7)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,.14)] text-[15px] text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          ✕
        </button>

        <div className="relative mb-7 mt-10 grid grid-cols-2 rounded-full border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.03)] p-1">
          <div
            aria-hidden="true"
            className="absolute inset-y-1 left-1 right-1/2 rounded-full bg-[#F3F0EA] transition-transform duration-300 ease-lux"
            style={{ transform: tab === 'individual' ? 'translateX(0%)' : 'translateX(100%)' }}
          />
          <TabButton active={tab === 'individual'} onClick={() => setTab('individual')}>
            For Myself
          </TabButton>
          <TabButton active={tab === 'business'} onClick={() => setTab('business')}>
            For My Team
          </TabButton>
        </div>

        <div className={tab === 'individual' ? undefined : 'hidden'}>
          <IndividualPanel
            form={individualForm}
            update={updateIndividual}
            setForm={setIndividualForm}
            onSubmit={handleIndividualSubmit}
            firstFieldRef={individualFirstFieldRef}
            attempted={individualAttempted}
          />
        </div>

        <div className={tab === 'business' ? undefined : 'hidden'}>
          <BusinessPanel
            form={businessForm}
            update={updateBusiness}
            setForm={setBusinessForm}
            onSubmit={handleBusinessSubmit}
            firstFieldRef={businessFirstFieldRef}
            attempted={businessAttempted}
          />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative z-10 flex items-center justify-center whitespace-nowrap rounded-full py-2.5 text-[13.5px] font-medium transition-colors duration-300"
      style={{ color: active ? '#0B0B0D' : 'rgba(243,240,234,.6)' }}
    >
      {children}
    </button>
  );
}

function FinishRowsField<T extends { rows: FinishRow[] }>({
  rows,
  setForm,
  attempted,
}: {
  rows: FinishRow[];
  setForm: (updater: (prev: T) => T) => void;
  attempted: boolean;
}) {
  const offer = useOffer();
  return (
    <div className="flex flex-col gap-3">
      {offer && <OfferBadge offer={offer} showEnd className="self-start" />}
      {rows.map((row, i) => {
        const subOptions = row.finish ? SUB_OPTIONS[row.finish] : undefined;
        const missingSubOption = attempted && !!row.finish && !!subOptions && !row.subOption;

        return (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-2xl border p-4"
            style={{
              borderColor: missingSubOption ? 'rgba(248,113,113,.5)' : 'rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.02)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-inter text-[10.5px] font-medium tracking-[.12em] text-grey-1">
                FINISH {i + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(setForm, row.id)}
                  aria-label="Remove this finish"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(243,240,234,.5)] transition-colors duration-300 hover:text-[#ff8a8a]"
                >
                  <X size={13} strokeWidth={1.8} aria-hidden="true" />
                </button>
              )}
            </div>

            <select
              value={row.finish}
              onChange={(e) => updateRow(setForm, row.id, { finish: e.target.value as Finish, subOption: '' })}
              className={selectClass()}
              style={selectChevronStyle}
            >
              <option value="" disabled style={optionStyle}>
                Select a finish
              </option>
              {FINISH_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={optionStyle}>
                  {f.label} — {offerPriceText(FINISH_PRICES[f.value], offer)}
                </option>
              ))}
            </select>

            {subOptions && (
              <select
                value={row.subOption}
                onChange={(e) => updateRow(setForm, row.id, { subOption: e.target.value })}
                className={selectClass(missingSubOption)}
                style={selectChevronStyle}
              >
                <option value="" disabled style={optionStyle}>
                  {row.finish === 'wood' ? 'Select wood finish' : 'Select color'}
                </option>
                {subOptions.map((o) => (
                  <option key={o.value} value={o.value} style={optionStyle}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[rgba(243,240,234,.6)]">Quantity</span>
              <QuantityStepper value={row.quantity} onChange={(q) => updateRow(setForm, row.id, { quantity: q })} />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => addRow(setForm)}
        className="self-start rounded-full border border-[rgba(255,255,255,.14)] px-4 py-2 text-[13px] font-medium text-[rgba(243,240,234,.78)] transition-colors duration-300 hover:border-accent hover:text-accent"
      >
        + Add Another
      </button>
    </div>
  );
}

function IndividualPanel({
  form,
  update,
  setForm,
  onSubmit,
  firstFieldRef,
  attempted,
}: {
  form: IndividualForm;
  update: <K extends keyof IndividualForm>(key: K, value: IndividualForm[K]) => void;
  setForm: (updater: (prev: IndividualForm) => IndividualForm) => void;
  onSubmit: (e: FormEvent) => void;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  attempted: boolean;
}) {
  const noRowsInvalid = attempted && !form.rows.some(isRowComplete);

  return (
    <>
      <div className="mb-7">
        <div className="mb-2 font-inter text-[10.5px] font-medium tracking-[.14em] text-accent">
          CREATE YOUR LUXECARD
        </div>
        <h3 className="m-0 font-manrope text-[clamp(24px,3.2vw,30px)] font-bold leading-[1.05] tracking-[-.025em]">
          Tell us about you.
        </h3>
        <p className="m-0 mt-3 text-[14.5px] leading-[1.55] text-[rgba(243,240,234,.5)]">
          A few details and we'll get your card into production.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <HoneypotField />
        <Field label="Full Name" required invalid={attempted && !form.fullName}>
          <input
            ref={firstFieldRef}
            type="text"
            required
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className={inputClass(attempted && !form.fullName)}
            placeholder="Jane Doe"
          />
        </Field>

        <div className="grid gap-5 min-[560px]:grid-cols-2">
          <Field label="Title / Role">
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className={inputClass()}
              placeholder="Founder"
            />
          </Field>
          <Field label="Company">
            <input
              type="text"
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className={inputClass()}
              placeholder="Acme Inc."
            />
          </Field>
        </div>

        <div className="grid gap-5 min-[560px]:grid-cols-2">
          <Field label="Email" required invalid={attempted && !form.email}>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass(attempted && !form.email)}
              placeholder="jane@acme.com"
            />
          </Field>
          <Field label="Phone" required invalid={attempted && !form.phone}>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={inputClass(attempted && !form.phone)}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
        </div>

        <Field
          label="Finishes & Quantities"
          required
          invalid={noRowsInvalid}
          hint="Add each finish you need — mix and match, with its own quantity."
        >
          <FinishRowsField rows={form.rows} setForm={setForm} attempted={attempted} />
        </Field>

        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
        >
          Add to Cart
        </button>
      </form>
    </>
  );
}

function BusinessPanel({
  form,
  update,
  setForm,
  onSubmit,
  firstFieldRef,
  attempted,
}: {
  form: BusinessForm;
  update: <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => void;
  setForm: (updater: (prev: BusinessForm) => BusinessForm) => void;
  onSubmit: (e: FormEvent) => void;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  attempted: boolean;
}) {
  const noRowsInvalid = attempted && !form.rows.some(isRowComplete);

  return (
    <>
      <div className="mb-7">
        <div className="mb-2 font-inter text-[10.5px] font-medium tracking-[.14em] text-accent">EQUIP YOUR TEAM</div>
        <h3 className="m-0 font-manrope text-[clamp(24px,3.2vw,30px)] font-bold leading-[1.05] tracking-[-.025em]">
          Tell us about your team.
        </h3>
        <p className="m-0 mt-3 text-[14.5px] leading-[1.55] text-[rgba(243,240,234,.5)]">
          A few details and we'll follow up with a plan for your organization.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <HoneypotField />
        <Field label="Organization Name" required invalid={attempted && !form.organization}>
          <input
            ref={firstFieldRef}
            type="text"
            required
            value={form.organization}
            onChange={(e) => update('organization', e.target.value)}
            className={inputClass(attempted && !form.organization)}
            placeholder="Acme Inc."
          />
        </Field>

        <div className="grid gap-5 min-[560px]:grid-cols-2">
          <Field label="Contact Person Name" required invalid={attempted && !form.contactName}>
            <input
              type="text"
              required
              value={form.contactName}
              onChange={(e) => update('contactName', e.target.value)}
              className={inputClass(attempted && !form.contactName)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Phone" required invalid={attempted && !form.phone}>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={inputClass(attempted && !form.phone)}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
        </div>

        <Field label="Email" required invalid={attempted && !form.email}>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass(attempted && !form.email)}
            placeholder="jane@acme.com"
          />
        </Field>

        <Field
          label="Finishes & Quantities"
          required
          invalid={noRowsInvalid}
          hint="Add each finish you need — mix and match, with its own quantity."
        >
          <FinishRowsField rows={form.rows} setForm={setForm} attempted={attempted} />
        </Field>

        <Field label="Message / Notes">
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            className={`${inputClass()} min-h-[96px] resize-y`}
            placeholder="Anything else we should know?"
          />
        </Field>

        <div className="flex flex-col gap-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.needsEtims}
              onChange={(e) => update('needsEtims', e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-[rgba(255,255,255,.22)] bg-[rgba(255,255,255,.03)] text-ink transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
            >
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="text-[15px] leading-[1.45] text-ivory">I need an eTIMS tax invoice</span>
          </label>

          {form.needsEtims && (
            <>
              <div className="grid gap-5 min-[560px]:grid-cols-2">
                <Field
                  label="KRA PIN"
                  required
                  invalid={attempted && !isValidKraPin(form.kraPin)}
                  errorText={KRA_PIN_ERROR}
                >
                  <input
                    type="text"
                    required
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    value={form.kraPin}
                    // No maxLength attribute: it would cut a pasted "p051 234 567x" short before
                    // the spaces are stripped. The length is capped after cleaning instead.
                    onChange={(e) => update('kraPin', normalizeKraPin(e.target.value).slice(0, KRA_PIN_LENGTH))}
                    className={`${inputClass(attempted && !isValidKraPin(form.kraPin))} uppercase`}
                    placeholder="P051234567X"
                  />
                </Field>
                <Field
                  label="Registered business name"
                  required
                  invalid={attempted && !form.kraBusinessName.trim()}
                  errorText={BUSINESS_NAME_ERROR}
                >
                  <input
                    type="text"
                    required
                    maxLength={KRA_BUSINESS_NAME_MAX}
                    autoComplete="off"
                    value={form.kraBusinessName}
                    onChange={(e) => update('kraBusinessName', e.target.value)}
                    className={inputClass(attempted && !form.kraBusinessName.trim())}
                    placeholder="As registered with KRA"
                  />
                </Field>
              </div>
              <p className="m-0 -mt-1 text-[12.5px] leading-[1.5] text-[rgba(243,240,234,.5)]">{ETIMS_INVOICE_NOTE}</p>
            </>
          )}
        </div>

        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
        >
          Add to Cart
        </button>
      </form>
    </>
  );
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex w-fit shrink-0 items-center gap-1 rounded-full border border-[rgba(255,255,255,.14)] p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease quantity"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
      >
        <Minus size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <span className="w-6 text-center text-[13.5px] text-ivory">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[rgba(243,240,234,.7)] transition-colors duration-300 hover:text-accent"
      >
        <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
