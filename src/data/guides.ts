// Guide articles (/guides, src/components/GuidesListPage.tsx and
// GuidePage.tsx). Each article's body is broken into typed blocks instead of
// raw markdown, the same approach legal.ts uses for the legal pages. Inline
// markup: **bold** and [text](url) links, same syntax the source article was
// written in.

export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface GuideSection {
  heading: string;
  blocks: GuideBlock[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  path: string;
  // The on-page H1.
  title: string;
  // document.title / <title> (front matter's seo_title).
  seoTitle: string;
  // Meta description (front matter's description).
  description: string;
  // ISO date (front matter's date).
  date: string;
  author: string;
  intro: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  // The closing button's label, linking to the homepage.
  ctaLabel: string;
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-design-a-business-card-kenya',
    path: '/guides/how-to-design-a-business-card-kenya',
    title: 'How to Design a Business Card in Kenya',
    seoTitle: 'How to Design a Business Card in Kenya | LuxeCard',
    description:
      'What to put on your business card, how to lay it out, print specs that actually matter, finishes like embossing and spot UV, and when an NFC card makes more sense.',
    date: '2026-10-22',
    author: 'LuxeCard',
    intro: [
      "Think about the last networking event you went to. You probably left with a handful of business cards. A week later, how many of them could you find? And of those, how many did you actually remember?",
      "That's the job a business card has to do. It's not just about handing over a phone number. It has to make someone remember you, and make it easy for them to reach you when the moment comes. Here's how to design one that does both, whether you go with paper or a card you can tap.",
    ],
    sections: [
      {
        heading: 'Start with what goes on it',
        blocks: [
          {
            type: 'p',
            text: 'Before you open any design tool, decide what the card needs to say. Most people need less than they think:',
          },
          {
            type: 'list',
            items: [
              '**Your name.** This should be the most visible thing on the card.',
              '**Your role and company,** so people remember where you fit.',
              '**A phone number,** written as +254 … so it works for people outside Kenya too.',
              "**An email address.** One on your company's domain looks more established than a free one.",
              '**One link.** Your website, or the one social profile you actually want people to visit.',
              '**Your logo,** if you have one.',
            ],
          },
          {
            type: 'p',
            text: "That's usually enough. You don't need your full postal address unless clients come to you, and you definitely don't need six social media icons. If you have more to share, a QR code can hold it without crowding the card.",
          },
        ],
      },
      {
        heading: 'Size and layout',
        blocks: [
          {
            type: 'p',
            text: 'A typical paper business card is about 85 × 55 mm. Plastic and NFC cards follow bank-card size, 85.6 × 54 mm, so they slide straight into a wallet slot.',
          },
          { type: 'p', text: 'A few layout habits make a big difference:' },
          {
            type: 'list',
            items: [
              '**Keep text away from the edges.** Leave at least 4 mm between any text and the edge of the card. Printers trim cards in batches, and anything too close to the edge can get cut.',
              "**Add bleed if your colour goes to the edge.** That means extending the background about 3 mm past the card's edge in your file, so there's no white line after trimming.",
              "**Don't go too small.** Contact details should be at least 7–8 pt. A card that needs squinting gets put away.",
              '**Stick to one or two fonts.** Simple sans-serif fonts are easiest to read at this size.',
              "**Leave some breathing room.** Empty space isn't wasted space. It's often what makes a card feel premium.",
            ],
          },
        ],
      },
      {
        heading: 'Colour and contrast',
        blocks: [
          {
            type: 'p',
            text: "Use your brand colours, but don't let them fight with your text. Dark text on a light background, or light text on a dark one, is always safe. The trouble starts with pale grey on white, or two mid-tones next to each other. They look fine on a bright laptop screen and disappear on paper.",
          },
          {
            type: 'p',
            text: "If you're printing, ask your designer for the file in CMYK. That's the colour system printers use. Colours chosen on screen (RGB) often come out flatter in print, and it's better to know before you order 500 cards.",
          },
        ],
      },
      {
        heading: 'Getting the file right for printing',
        blocks: [
          { type: 'p', text: 'This is where many good designs go wrong:' },
          {
            type: 'list',
            items: [
              'Send a **PDF at 300 dpi or higher,** with the bleed included.',
              'Use your logo as a **vector file** (SVG, AI or EPS) so the edges stay sharp.',
              "**Embed your fonts,** or convert the text to outlines, so the printer's computer doesn't swap them.",
              '**Check every digit of your phone number.** Then ask someone else to check it. One wrong number and the whole batch is useless.',
            ],
          },
        ],
      },
      {
        heading: 'Choosing a finish',
        blocks: [
          {
            type: 'p',
            text: 'The finish is how the card feels when someone holds it. It says a lot before they read a word.',
          },
          {
            type: 'table',
            headers: ['Finish', "What it's like", 'Works well for'],
            rows: [
              ['Matte', 'Soft, no shine, easy to write on', 'Clean, modern brands'],
              ['Gloss', 'Shiny, colours pop', 'Bright or photo-heavy designs'],
              ['Embossed', 'Raised text or logo you can feel', 'Traditional, established brands'],
              ['Spot UV', 'Glossy shine on just one part, like the logo', 'Adding a subtle highlight'],
              ['Metal or wood', 'A solid card with real weight or real grain', 'Executives and premium brands'],
            ],
          },
        ],
      },
      {
        heading: 'Where paper cards fall short',
        blocks: [
          {
            type: 'p',
            text: "Even a beautifully designed paper card has a few problems you can't design your way out of.",
          },
          {
            type: 'p',
            text: 'Your details change. You get a new number, a promotion, a new company, and suddenly a box of cards is out of date. You run out, usually right at the event where you needed them. And even when someone keeps your card, they still have to type everything into their phone. Many never get round to it.',
          },
        ],
      },
      {
        heading: 'The upgrade: a business card you tap',
        blocks: [
          {
            type: 'p',
            text: "An NFC business card looks and feels like a quality business card, but it has a small chip inside. When someone taps it on their phone, your digital profile opens: your number, email, socials, website and portfolio, with a button to save you straight to their contacts. They don't need an app. For older phones without NFC, a QR code on the card does the same job.",
          },
          {
            type: 'p',
            text: "It's basically a virtual business card you can hold in your hand. If your number or title changes, you update your profile and the card keeps working. You order one card instead of reprinting hundreds.",
          },
        ],
      },
      {
        heading: 'How it works at LuxeCard',
        blocks: [
          {
            type: 'p',
            text: 'We design every LuxeCard with you. You send us your logo and details, our team prepares your design, and you approve a preview before anything is made. Then we produce your card and deliver it, free within Nairobi.',
          },
          { type: 'p', text: 'You can choose from four materials:' },
          {
            type: 'list',
            items: [
              '**[Plastic](https://www.luxecard.co.ke/plastic)** in any colour, for a bold, branded look',
              '**[Wood](https://www.luxecard.co.ke/wood)** in Natural or Black, for something warm and memorable',
              '**[Metallic](https://www.luxecard.co.ke/metal)** in Silver or Black, for a card with real weight',
              "**[The Chairman's Card](https://www.luxecard.co.ke/chairman),** in a brushed gold finish",
            ],
          },
          { type: 'p', text: "Ordering for a team? There's 10% off when you order more than three cards." },
        ],
      },
    ],
    faqs: [
      {
        q: 'What size is a business card in Kenya?',
        a: 'Paper cards are usually about 85 × 55 mm. NFC and plastic cards are bank-card size, 85.6 × 54 mm.',
      },
      {
        q: 'What should I put on my business card?',
        a: "Your name, role, company, phone number, email and one link. If it doesn't help someone contact you or remember you, leave it off.",
      },
      {
        q: 'Can I design my own business card?',
        a: "Yes. Free tools like Canva are fine if you follow the size, edge and file tips above. If you'd rather not, LuxeCard designs your card for you and sends a preview to approve.",
      },
      {
        q: 'Do NFC business cards work with every phone?',
        a: 'Most iPhones and Android phones from the last several years can read NFC. For the rest, the QR code on the card opens the same profile.',
      },
      {
        q: 'Is an NFC business card worth it?',
        a: 'If you meet new people often, or your details change, it usually is. One card replaces boxes of paper ones, never runs out, and makes it much more likely people actually save your number.',
      },
    ],
    ctaLabel: "See LuxeCard's NFC business cards",
  },
];
