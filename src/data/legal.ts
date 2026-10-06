// Legal page copy, transcribed verbatim from the signed-off PDFs
// (terms-of-service.pdf, privacy-policy.pdf, returns-refunds.pdf).
// Inline markup: **bold**, and any email address is rendered as a mailto link.

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  title: string;
  body: LegalBlock[];
}

export interface LegalDoc {
  path: string;
  navLabel: string;
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}

const EFFECTIVE_DATE = '25 September 2026';

export const TERMS: LegalDoc = {
  path: '/terms',
  navLabel: 'Terms of Service',
  title: 'Terms of Service',
  effectiveDate: EFFECTIVE_DATE,
  intro:
    'These Terms govern your use of the LuxeCard website and services provided by **LuxeCard Limited** ("LuxeCard", "we", "us"). By ordering, purchasing, or creating a digital profile with us, you agree to these Terms. If you disagree, please don\'t use our services.',
  sections: [
    {
      title: 'Our Services',
      body: [
        'NFC- and QR-enabled business cards (plastic, wood, metal), digital business profiles, contact-sharing, profile hosting, analytics, and corporate/bulk solutions. Features vary by product.',
      ],
    },
    {
      title: 'Orders',
      body: [
        'An order is a request to purchase. It is only confirmed once we have received the required deposit or payment; we may decline or cancel an order for unverifiable payment, materially inaccurate information, unavailability, suspected fraud, or circumstances beyond our reasonable control. Refunds for cancelled paid orders follow our Returns & Refund Policy.',
      ],
    },
    {
      title: 'Prices and Payment',
      body: [
        'Prices are in KES and may change; the price at order confirmation applies. We accept M-Pesa, card, bank transfer, and other authorised methods. A deposit is required to confirm every order — corporate and individual alike — before production begins. Any balance must be settled on the terms agreed at order confirmation, and production of customised cards will only commence once the required deposit has been received and your design approved.',
      ],
    },
    {
      title: 'Customised Products',
      body: [
        'You are responsible for the accuracy of all names, logos, artwork, photos, QR/NFC content, and other material you submit, and for reviewing any proof before production. Once you approve a design, you confirm it is correct and authorise production. LuxeCard is not liable for errors present in artwork you approved where the final product matches it — this does not affect your statutory rights under the **Sale of Goods Act (Cap 31)** where a product is defective or not as described.',
      ],
    },
    {
      title: 'Design Revisions',
      body: [
        'Included revisions depend on your order/quotation. Work beyond the agreed scope may incur extra charges, only where these are communicated to and accepted by you in advance.',
      ],
    },
    {
      title: 'Production and Delivery',
      body: [
        "Production begins once the required deposit or payment, required information, artwork, and design approval are received; timelines are estimates unless a specific date is confirmed in writing. Delivery timing depends on location, courier availability, and factors outside our control. You're responsible for providing accurate delivery details; we're not liable for delays caused by inaccurate details you supplied. Delivery charges may apply.",
      ],
    },
    {
      title: 'Digital Profiles',
      body: [
        "You're responsible for the accuracy and lawfulness of information on your digital profile. Anything you publish on a public profile may be viewed by anyone who scans your card/QR code or opens your link — don't publish information you don't want public. See our Privacy Policy for how we handle your data.",
      ],
    },
    {
      title: 'Acceptable Use',
      body: [
        'You may not use LuxeCard to break the law, impersonate others, distribute malware, infringe IP rights, spread fraudulent content, harass or threaten anyone, or interfere with our systems — conduct that may also constitute an offence under the **Computer Misuse and Cybercrimes Act, 2018**. We may suspend or terminate accounts for material breaches, subject to applicable law.',
      ],
    },
    {
      title: 'Intellectual Property',
      body: [
        "LuxeCard's branding, software, platform, and website content belong to us or our licensors and may not be reproduced or commercially exploited without written permission. You retain ownership of material you provide us, subject to the licence needed for us to deliver your order.",
      ],
    },
    {
      title: 'Third-Party Services',
      body: [
        'We use third-party providers (payments, hosting, analytics, delivery, CRM, cloud) who have their own terms and privacy policies.',
      ],
    },
    {
      title: 'Service Availability',
      body: [
        "We aim for reliable access but don't guarantee uninterrupted or error-free service, given maintenance, technical issues, or circumstances beyond our control.",
      ],
    },
    {
      title: 'Limitation of Liability',
      body: [
        'To the extent permitted by Kenyan law, LuxeCard is not liable for indirect or consequential losses arising from use of our services. Nothing here excludes liability that cannot lawfully be excluded, or limits your statutory rights under the **Sale of Goods Act**, **Consumer Protection Act, 2012**, or **Data Protection Act, 2019**.',
      ],
    },
    {
      title: 'Force Majeure',
      body: [
        "We're not liable for delay or failure caused by events beyond our reasonable control (natural disasters, government action, strikes, infrastructure or telecommunications failures, cyber incidents, and similar).",
      ],
    },
    {
      title: 'Complaints',
      body: ['Email sales@luxecard.co.ke. We will investigate and seek a reasonable resolution.'],
    },
    {
      title: 'Governing Law',
      body: [
        'These Terms are governed by the laws of Kenya. Disputes are subject to the jurisdiction of competent Kenyan courts, without prejudice to any mandatory consumer dispute-resolution rights.',
      ],
    },
    {
      title: 'Changes',
      body: ['We may update these Terms; the current version with its effective date is always published on our website.'],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  path: '/privacy',
  navLabel: 'Privacy Policy',
  title: 'Privacy & Data Protection Policy',
  // Updated separately from the Terms and Returns policy (Vercel Web
  // Analytics added to Cookies).
  effectiveDate: '6 October 2026',
  intro:
    'LuxeCard Limited ("LuxeCard", "we", "us") processes personal data in accordance with the **Data Protection Act, 2019** and its Regulations. This policy explains what we collect, why, how we share it, and your rights.',
  sections: [
    {
      title: 'Who We Are',
      body: [
        'LuxeCard Limited is the data controller (and, for certain processing, the data processor) for the purposes described below. Contact: sales@luxecard.co.ke.',
      ],
    },
    {
      title: 'Information We Collect',
      body: [
        {
          list: [
            '**Identity:** name, job title, company, photo, professional info',
            '**Contact:** phone, email, WhatsApp, delivery address',
            '**Digital profile content:** anything you choose to publish — bio, links, photos, videos, business details',
            '**Transaction data:** orders, payment status, invoices, delivery info (we do not store full card details — these are handled by our payment provider)',
            '**Technical data:** IP address, browser/device info, pages visited, referring URLs, and similar data from website use',
          ],
        },
      ],
    },
    {
      title: 'How We Collect It',
      body: [
        'Directly from you — when you order, build a profile, contact us, or use our website/WhatsApp — and via cookies, analytics, or authorised partners where the law permits.',
      ],
    },
    {
      title: 'Why We Use It',
      body: [
        "To process orders and payments, manufacture customised products, build and host digital profiles, deliver goods, provide support, prevent fraud, maintain security and records, meet legal obligations, and — where you've consented or it's otherwise permitted — send marketing.",
      ],
    },
    {
      title: 'Lawful Basis',
      body: [
        "Depending on the activity: performance of a contract, pre-contractual steps at your request, your consent, a legal obligation, or our legitimate interests where these don't override your rights.",
      ],
    },
    {
      title: 'Public Digital Profiles',
      body: [
        "Anything you publish on your LuxeCard profile is visible to anyone who scans your card/QR code or opens your link. Don't publish sensitive personal data you don't want public.",
      ],
    },
    {
      title: 'Marketing',
      body: [
        "We'll only send marketing where you've consented (e.g. the checkout marketing checkbox) or another lawful basis applies; you can opt out anytime. Transactional messages (order confirmations, delivery updates) continue regardless, as they're necessary to provide the service.",
      ],
    },
    {
      title: 'Cookies',
      body: [
        "Our site uses cookies for core functionality, preferences, usage analytics, and security. We'll seek your consent before using non-essential cookies, as required by law.",
        'We also use Vercel Web Analytics to count visits to our website; it does not use cookies or store anything on your device, and records only aggregated information such as the page visited, referring site, country and device type.',
      ],
    },
    {
      title: 'Sharing Your Data',
      body: [
        "We share data with service providers where necessary — payment processors, hosting/cloud, CRM, analytics, delivery, and professional advisers — and with regulators or law enforcement where legally required. We do not sell your data for third parties' own marketing.",
      ],
    },
    {
      title: 'International Transfers',
      body: [
        'Some providers process data outside Kenya. Where this happens, we rely on one of the mechanisms permitted under **section 48 of the Data Protection Act, 2019** — an adequacy finding, appropriate contractual safeguards, your consent, or ODPC approval.',
      ],
    },
    {
      title: 'Security',
      body: [
        'We use reasonable technical and organisational measures to protect your data against unauthorised access, loss, or misuse, though no online system is completely secure.',
      ],
    },
    {
      title: 'Retention',
      body: [
        'We keep personal data only as long as reasonably necessary for the purpose collected, dispute resolution, or legal compliance, then delete, anonymise, or securely dispose of it.',
      ],
    },
    {
      title: 'Your Rights',
      body: [
        'Subject to the DPA, you may request access, correction, deletion, restriction, or portability of your data, object to certain processing, and withdraw consent at any time. Contact sales@luxecard.co.ke — we may verify your identity before acting on a request.',
      ],
    },
    {
      title: 'Complaints',
      body: [
        'Contact us first so we can investigate. You may also lodge a complaint with the **Office of the Data Protection Commissioner (ODPC)**.',
      ],
    },
    {
      title: "Children's Data",
      body: [
        "Our services are intended for adults and businesses. We do not knowingly collect data from a **child (under 18, per the Children Act)** without a parent's or guardian's consent. Contact us if you believe this has happened.",
      ],
    },
    {
      title: 'Third-Party Links',
      body: ["Our site may link to third-party sites; we're not responsible for their privacy practices."],
    },
    {
      title: 'Changes',
      body: ['We may update this policy; the current version and effective date are always on our website.'],
    },
  ],
};

export const RETURNS: LegalDoc = {
  path: '/returns',
  navLabel: 'Return Policy',
  title: 'Returns/Refund Policy',
  effectiveDate: EFFECTIVE_DATE,
  intro:
    'LuxeCards are frequently personalised, so this policy distinguishes customised products, defective products, and cancellations. Nothing here removes any right you have under the **Consumer Protection Act, 2012** or **Sale of Goods Act (Cap 31)**.',
  sections: [
    {
      title: 'Customised Products',
      body: [
        "Once personalised with your name, logo, artwork, QR/NFC content, or other specifications, a product generally cannot be returned for a simple change of mind after production has started. This doesn't affect your rights if the product is defective, materially incorrect, or doesn't match the agreed specification.",
      ],
    },
    {
      title: 'Cancelling Before Production',
      body: [
        'You may cancel before production starts. Any refund may deduct costs already reasonably incurred — completed design work, materials purchased, or third-party charges — provided these were disclosed to you in the order process. We will not withhold amounts beyond what Kenyan law permits.',
      ],
    },
    {
      title: 'Cancelling After Production Starts',
      body: [
        'Cancellations after production begins may be subject to the same cost deductions. Where the law requires a refund, replacement, or other remedy regardless, we will comply.',
      ],
    },
    {
      title: 'Defective or Incorrect Products',
      body: [
        "If your card arrives defective, significantly damaged, or materially different from the approved design, contact us promptly with your order number, a description of the issue, and photos/video. Depending on the circumstances we'll offer repair, replacement, correction, refund, or another appropriate remedy.",
      ],
    },
    {
      title: 'Design Errors',
      body: [
        'If an error was in the artwork you approved, you may be charged for a replacement. If we introduced the error despite correct, approved artwork, we will remedy it at our cost.',
      ],
    },
    {
      title: 'Digital Services',
      body: [
        'Digital profile services may be non-refundable once activated or substantially delivered, subject to the specific terms of your purchase and applicable law.',
      ],
    },
    {
      title: 'Delivery Damage',
      body: [
        "Contact us promptly with evidence if your product arrives damaged in transit; we'll assess and arrange an appropriate remedy.",
      ],
    },
    {
      title: 'Refund Processing',
      body: [
        'Approved refunds are normally returned via your original payment method. Timing depends on your payment provider or bank.',
      ],
    },
    {
      title: 'How to Request a Refund or Replacement',
      body: [
        'Email sales@luxecard.co.ke with your full name, order number, phone number, purchase date, product, and reason for the request.',
      ],
    },
    {
      title: 'Your Statutory Rights',
      body: ['Nothing in this policy limits or waives any right or remedy available to you under Kenyan law.'],
    },
  ],
};

export const LEGAL_DOCS = [TERMS, PRIVACY, RETURNS];
