import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, CheckCircle2, FileText, Loader2, Plus, Upload, X } from 'lucide-react';
import {
  contentTypeOf,
  MAX_BIO,
  MAX_SOCIALS,
  MAX_UPLOAD_BYTES,
  normalizeKenyanPhone,
  normalizeUrl,
  REF_PATTERN,
  SOCIAL_NETWORKS,
  UPLOAD_ACCEPT,
  UPLOAD_TYPES,
  type SocialNetwork,
  type UploadKind,
} from '../../api/_lib/profileDetails';
import { inputClass } from '../utils/inputClass';
import { readHoneypot } from '../utils/honeypot';
import { resizePhoto } from '../utils/resizeImage';
import { Field } from './FormField';
import { HoneypotField } from './HoneypotField';

// www.luxecard.co.ke/details: an unlisted page (noindex, not in the nav,
// footer or sitemap) where customers send the details for their digital
// profile. ?ref= (an LC- WhatsApp reference or a Paystack order reference)
// is passed on so the team can match it; nothing about any order is shown.
// Files go straight from the browser to a private bucket through signed
// upload URLs (api/profile-details.ts), never through our own functions.

type Upload =
  | { status: 'idle' }
  | { status: 'working'; name: string }
  | { status: 'done'; name: string; path: string }
  | { status: 'error'; name: string; error: string };

type Social = { key: number; network: SocialNetwork; url: string };

const UPLOAD_LABELS: Record<UploadKind, string> = {
  business_card: 'JPG, PNG, WebP, HEIC or PDF, up to 10MB',
  photo: 'JPG, PNG, WebP or HEIC, up to 10MB',
  logo: 'JPG, PNG, WebP, PDF or SVG, up to 10MB',
};

function refFromUrl(): string | null {
  const ref = new URLSearchParams(window.location.search).get('ref')?.trim() ?? '';
  return REF_PATTERN.test(ref) ? ref : null;
}

async function uploadFile(kind: UploadKind, file: File): Promise<{ path: string } | { error: string }> {
  const type = contentTypeOf(file.name, file.type);
  if (!UPLOAD_TYPES[kind][type]) return { error: `This file type isn't accepted here (${UPLOAD_LABELS[kind]}).` };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'This file is over 10MB. Please choose a smaller one.' };
  // Photos are shrunk to 2000px; PDF and SVG are uploaded exactly as chosen.
  const { file: body, contentType } = await resizePhoto(file, type);
  try {
    const res = await fetch('/api/profile-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-url', kind, contentType, size: body.size }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.signedUrl !== 'string') return { error: data.error ?? 'Upload failed. Please try again.' };
    const put = await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
      body,
    });
    if (!put.ok) return { error: 'Upload failed. Please try again.' };
    return { path: data.path as string };
  } catch {
    return { error: 'Upload failed. Check your connection and try again.' };
  }
}

export function ProfileDetailsPage() {
  const [ref] = useState(refFromUrl);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondPhone, setSecondPhone] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [socials, setSocials] = useState<Social[]>([]);
  const [bio, setBio] = useState('');
  const [consent, setConsent] = useState(false);
  const [uploads, setUploads] = useState<Record<UploadKind, Upload>>({
    business_card: { status: 'idle' },
    photo: { status: 'idle' },
    logo: { status: 'idle' },
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const socialKey = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = 'Your digital profile | LuxeCard';
  }, []);

  const hasCard = uploads.business_card.status === 'done';
  const uploading = Object.values(uploads).some((u) => u.status === 'working');

  // Each field's problem, or null. Shown once the field has been left, or
  // after a first attempt to send.
  const errors: Record<string, string | null> = {
    fullName: fullName.trim() ? null : 'Please enter your full name.',
    phone: !phone.trim()
      ? 'Please enter your WhatsApp number.'
      : normalizeKenyanPhone(phone)
        ? null
        : 'Enter a Kenyan number, e.g. 0712 345 678 or +254 712 345 678.',
    secondPhone:
      secondPhone.trim() && !normalizeKenyanPhone(secondPhone)
        ? 'Enter a Kenyan number, e.g. 0712 345 678 or +254 712 345 678.'
        : null,
    email: !email.trim()
      ? hasCard
        ? null
        : 'Please enter your email address.'
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? null
        : 'Please enter a valid email address.',
    website: website.trim() && !normalizeUrl(website) ? 'Please enter a valid web address, e.g. yourcompany.co.ke.' : null,
    bio: bio.length > MAX_BIO ? `Please keep your bio to ${MAX_BIO} characters.` : null,
    consent: consent ? null : 'Please tick this box so we can use your details.',
    ...Object.fromEntries(
      socials.map((s) => [`social-${s.key}`, normalizeUrl(s.url) ? null : 'Please paste the full link to your profile.'])
    ),
  };
  const show = (field: string) => (attempted || touched[field] ? errors[field] : null);
  const touch = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  const choose = async (kind: UploadKind, file: File | null) => {
    if (!file) return;
    setUploads((u) => ({ ...u, [kind]: { status: 'working', name: file.name } }));
    const result = await uploadFile(kind, file);
    setUploads((u) => ({
      ...u,
      [kind]: 'path' in result ? { status: 'done', name: file.name, path: result.path } : { status: 'error', name: file.name, error: result.error },
    }));
  };
  const clearUpload = (kind: UploadKind) => setUploads((u) => ({ ...u, [kind]: { status: 'idle' } }));

  const addSocial = () => {
    const used = new Set(socials.map((s) => s.network));
    const network = SOCIAL_NETWORKS.find((n) => !used.has(n.id))?.id ?? 'linkedin';
    setSocials((list) => [...list, { key: ++socialKey.current, network, url: '' }]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hp = readHoneypot(e);
    setAttempted(true);
    setFormError(null);
    if (uploading) {
      setFormError('Please wait for your files to finish uploading.');
      return;
    }
    const firstError = Object.entries(errors).find(([, v]) => v)?.[0];
    if (firstError) {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstError}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
      return;
    }
    setStatus('sending');
    try {
      const path = (u: Upload) => (u.status === 'done' ? u.path : null);
      const res = await fetch('/api/profile-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          ref,
          fullName,
          phone,
          secondPhone,
          email,
          title,
          company,
          website,
          socials: socials.map(({ network, url }) => ({ network, url })),
          bio,
          consent,
          businessCardPath: path(uploads.business_card),
          photoPath: path(uploads.photo),
          logoPath: path(uploads.logo),
          hp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      setStatus('sent');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setStatus('idle');
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-[100vh]" style={{ background: 'var(--bg-base)' }}>
      <header className="mx-auto flex max-w-[640px] items-center px-5 pt-6 sm:pt-8">
        <a href="/" className="flex items-center">
          <img src="/images/luxecard-logo.webp" alt="LuxeCard" width={534} height={100} className="h-7 w-auto sm:h-8" />
        </a>
      </header>

      <main className="mx-auto max-w-[640px] px-5 pb-20 pt-10 sm:pt-14">
        {status === 'sent' ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'rgba(253,211,3,.1)', border: '1px solid rgba(253,211,3,.3)' }}
            >
              <CheckCircle2 size={28} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
            </div>
            <h1 className="m-0 mt-8 font-manrope text-[clamp(30px,6vw,44px)] font-bold leading-[1.08] tracking-[-.03em]">
              Thank you!
            </h1>
            <p className="m-0 mt-4 max-w-[440px] text-[16px] leading-[1.6] text-[rgba(243,240,234,.65)]" role="status">
              We've received your details. We'll send your profile preview on WhatsApp for approval.
            </p>
            <a
              href="/"
              className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-ivory px-7 py-[15px] text-[15px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 hover:bg-white"
            >
              Back to Home
            </a>
          </div>
        ) : (
          <>
            <h1 className="m-0 font-manrope text-[clamp(32px,7vw,48px)] font-bold leading-[1.05] tracking-[-.03em]">
              Your digital profile
            </h1>
            <p className="m-0 mt-4 text-[16px] leading-[1.6] text-[rgba(243,240,234,.65)]">
              Takes about 2 minutes. We'll send you a preview to approve before it goes live, and you can update it any time.
            </p>

            <form ref={formRef} noValidate onSubmit={handleSubmit} className="relative mt-9 flex flex-col gap-6">
              <HoneypotField />

              {/* The shortcut: a business card instead of typing. */}
              <div
                data-field="business_card"
                className="rounded-2xl border p-5"
                style={{ borderColor: 'rgba(253,211,3,.32)', background: 'rgba(253,211,3,.05)' }}
              >
                <p className="m-0 text-[15.5px] font-semibold leading-[1.45] text-ivory">
                  Have a business card? Upload a photo of it and we'll copy your details.
                </p>
                <div className="mt-4">
                  <FilePicker
                    kind="business_card"
                    label="Upload your business card"
                    upload={uploads.business_card}
                    onChoose={choose}
                    onClear={clearUpload}
                  />
                </div>
                {hasCard && (
                  <p className="m-0 mt-3 text-[13.5px] leading-[1.5] text-[rgba(243,240,234,.7)]">
                    Got it. Now we only need your name, WhatsApp number and the tick below; add anything else you like.
                  </p>
                )}
              </div>

              <Section title="Your details">
                <div data-field="fullName">
                  <Field label="Full name" required invalid={!!show('fullName')} errorText={show('fullName') ?? undefined}>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={touch('fullName')}
                      autoComplete="name"
                      maxLength={200}
                      className={inputClass(!!show('fullName'))}
                    />
                  </Field>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Job title">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="organization-title" maxLength={200} placeholder="e.g. Founder" className={inputClass()} />
                  </Field>
                  <Field label="Company">
                    <input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" maxLength={200} className={inputClass()} />
                  </Field>
                </div>
              </Section>

              <Section title="How people reach you">
                <div data-field="phone">
                  <Field
                    label="Phone (WhatsApp)"
                    required
                    invalid={!!show('phone')}
                    errorText={show('phone') ?? undefined}
                    hint="Kenyan number, e.g. 0712 345 678 or +254 712 345 678."
                  >
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={touch('phone')}
                      autoComplete="tel"
                      placeholder="0712 345 678"
                      className={inputClass(!!show('phone'))}
                    />
                  </Field>
                </div>
                <div data-field="secondPhone">
                  <Field label="Second phone" invalid={!!show('secondPhone')} errorText={show('secondPhone') ?? undefined}>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={secondPhone}
                      onChange={(e) => setSecondPhone(e.target.value)}
                      onBlur={touch('secondPhone')}
                      placeholder="Optional"
                      className={inputClass(!!show('secondPhone'))}
                    />
                  </Field>
                </div>
                <div data-field="email">
                  <Field label="Email" required={!hasCard} invalid={!!show('email')} errorText={show('email') ?? undefined}>
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={touch('email')}
                      autoComplete="email"
                      maxLength={200}
                      className={inputClass(!!show('email'))}
                    />
                  </Field>
                </div>
                <div data-field="website">
                  <Field label="Website" invalid={!!show('website')} errorText={show('website') ?? undefined}>
                    <input
                      type="url"
                      inputMode="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      onBlur={() => {
                        touch('website')();
                        const clean = normalizeUrl(website);
                        if (clean) setWebsite(clean);
                      }}
                      autoComplete="url"
                      placeholder="yourcompany.co.ke"
                      className={inputClass(!!show('website'))}
                    />
                  </Field>
                </div>

                {/* Social links: pick the network, paste the link. */}
                <div className="flex flex-col gap-4">
                  <span className="font-inter text-[11px] font-medium tracking-[.1em] text-grey-1">SOCIAL LINKS</span>
                  {socials.map((s) => {
                    const field = `social-${s.key}`;
                    const example = SOCIAL_NETWORKS.find((n) => n.id === s.network)?.example;
                    return (
                      <div key={s.key} data-field={field} className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {/* A fixed-width network picker; the link takes the rest. */}
                          <select
                            aria-label="Network"
                            value={s.network}
                            onChange={(e) =>
                              setSocials((list) => list.map((x) => (x.key === s.key ? { ...x, network: e.target.value as SocialNetwork } : x)))
                            }
                            className={`${inputClass().replace('w-full ', '')} w-[124px] shrink-0 appearance-none pr-2 sm:w-[140px] [&>option]:bg-[#101013]`}
                          >
                            {SOCIAL_NETWORKS.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="url"
                            inputMode="url"
                            aria-label="Link to your profile"
                            value={s.url}
                            onChange={(e) => setSocials((list) => list.map((x) => (x.key === s.key ? { ...x, url: e.target.value } : x)))}
                            onBlur={() => {
                              touch(field)();
                              const clean = normalizeUrl(s.url);
                              if (clean) setSocials((list) => list.map((x) => (x.key === s.key ? { ...x, url: clean } : x)));
                            }}
                            placeholder={example}
                            className={`${inputClass(!!show(field)).replace('w-full ', '')} min-w-0 flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => setSocials((list) => list.filter((x) => x.key !== s.key))}
                            aria-label="Remove this link"
                            className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,.14)] text-[rgba(243,240,234,.6)] transition-colors hover:border-[#F87171] hover:text-[#F87171]"
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                        {show(field) && <span className="text-[12.5px] text-[#F87171]">{show(field)}</span>}
                      </div>
                    );
                  })}
                  {socials.length < MAX_SOCIALS && (
                    <button
                      type="button"
                      onClick={addSocial}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(255,255,255,.18)] px-4 py-2.5 text-[14px] text-ivory transition-colors hover:border-accent hover:text-accent"
                    >
                      <Plus size={15} aria-hidden="true" /> Add a social link
                    </button>
                  )}
                </div>
              </Section>

              <Section title="Photo, logo and bio">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="font-inter text-[11px] font-medium tracking-[.1em] text-grey-1">PROFILE PHOTO</span>
                    <FilePicker kind="photo" label="Add a photo" upload={uploads.photo} onChoose={choose} onClear={clearUpload} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-inter text-[11px] font-medium tracking-[.1em] text-grey-1">LOGO</span>
                    <FilePicker kind="logo" label="Add your logo" upload={uploads.logo} onChoose={choose} onClear={clearUpload} />
                  </div>
                </div>
                <div data-field="bio">
                  <Field label="Short bio" invalid={!!show('bio')} errorText={show('bio') ?? undefined}>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      onBlur={touch('bio')}
                      rows={4}
                      placeholder="A line or two about you or your business."
                      className={`${inputClass(!!show('bio'))} resize-y`}
                    />
                  </Field>
                  <p className={`m-0 mt-1.5 text-right font-inter text-[12px] ${bio.length > MAX_BIO ? 'text-[#F87171]' : 'text-[rgba(243,240,234,.4)]'}`} aria-live="polite">
                    {bio.length}/{MAX_BIO}
                  </p>
                </div>
              </Section>

              <div data-field="consent" className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border ${
                      show('consent') ? 'border-[#F87171]' : 'border-[rgba(255,255,255,.22)]'
                    } bg-[rgba(255,255,255,.03)] text-ink transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-[14.5px] leading-[1.5] text-ivory">
                    I confirm these details can appear on my public LuxeCard profile, and LuxeCard may contact me about my order.
                    <span className="text-accent"> *</span>
                  </span>
                </label>
                {show('consent') && <span className="pl-[34px] text-[12.5px] text-[#F87171]">{show('consent')}</span>}
              </div>

              {formError && (
                <p role="alert" className="m-0 rounded-xl border border-[rgba(248,113,113,.4)] bg-[rgba(248,113,113,.08)] px-4 py-3 text-[14px] text-[#FCA5A5]">
                  {formError}
                </p>
              )}
              {attempted && !formError && Object.values(errors).some(Boolean) && (
                <p role="alert" className="m-0 text-[14px] text-[#FCA5A5]">
                  Please fix the highlighted fields above.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="mt-1 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-accent px-7 py-[16px] text-[15.5px] font-semibold text-ink transition-transform duration-300 ease-lux hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  'Send my details'
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-5 border-0 border-t border-[rgba(255,255,255,.08)] p-0 pt-6">
      <legend className="float-left mb-1 w-full p-0 font-manrope text-[18px] font-semibold tracking-[-.01em] text-ivory">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FilePicker({
  kind,
  label,
  upload,
  onChoose,
  onClear,
}: {
  kind: UploadKind;
  label: string;
  upload: Upload;
  onChoose: (kind: UploadKind, file: File | null) => void;
  onClear: (kind: UploadKind) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (upload.status === 'idle') {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-[rgba(255,255,255,.22)] bg-[rgba(255,255,255,.02)] px-4 py-4 text-[14.5px] text-ivory transition-colors hover:border-accent hover:text-accent"
        >
          <Upload size={16} aria-hidden="true" /> {label}
        </button>
        <span className="text-[12.5px] text-[rgba(243,240,234,.4)]">{UPLOAD_LABELS[kind]}</span>
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT[kind]}
          className="sr-only"
          tabIndex={-1}
          aria-label={label}
          onChange={(e) => {
            onChoose(kind, e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          upload.status === 'error' ? 'border-[#F87171]' : 'border-[rgba(255,255,255,.14)]'
        } bg-[rgba(255,255,255,.03)]`}
      >
        {upload.status === 'working' ? (
          <Loader2 size={18} className="shrink-0 animate-spin text-accent" aria-hidden="true" />
        ) : upload.status === 'done' ? (
          <CheckCircle2 size={18} className="shrink-0 text-accent" aria-hidden="true" />
        ) : (
          <FileText size={18} className="shrink-0 text-[#F87171]" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate text-[14px] text-ivory">{upload.name}</span>
        <span className="shrink-0 text-[12.5px] text-[rgba(243,240,234,.5)]" aria-live="polite">
          {upload.status === 'working' ? 'Uploading…' : upload.status === 'done' ? 'Uploaded' : ''}
        </span>
        {upload.status !== 'working' && (
          <button
            type="button"
            onClick={() => onClear(kind)}
            aria-label={`Remove ${upload.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[rgba(243,240,234,.6)] transition-colors hover:text-[#F87171]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {upload.status === 'error' && <span className="text-[12.5px] text-[#F87171]">{upload.error}</span>}
    </div>
  );
}
