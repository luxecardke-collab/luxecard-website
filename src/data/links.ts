const WHATSAPP_NUMBER = '254729728339'; // +254 729 728339
const WHATSAPP_MESSAGE = "Hi, I'm interested in getting a LuxeCard";
const EMAIL = 'sales@luxecard.co.ke';

export const LINKS = {
  CONTACT: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
  WHATSAPP_NUMBER,
  PHONE_DISPLAY: '+254 729 728339',
  PHONE_TEL: `tel:+${WHATSAPP_NUMBER}`,
  PHONE2_DISPLAY: '+254 142 492026',
  PHONE2_TEL: 'tel:+254142492026',
  EMAIL,
  EMAIL_MAILTO: `mailto:${EMAIL}`,
  ADDRESS: 'LuxeCard, Nairobi',
  MAP_EMBED_SRC: 'https://www.google.com/maps?cid=5612187112014979747&output=embed',
  SOCIAL: {
    instagram: 'https://www.instagram.com/luxecard_africa/',
    linkedin: 'https://www.linkedin.com/company/luxecardkenya',
    facebook: 'https://www.facebook.com/share/1He7pzsGH2/?mibextid=wwXIfr',
    tiktok: 'https://www.tiktok.com/@luxecard_africa?_r=1&_t=ZS-9A2zTOekiZQ',
    youtube: 'https://youtube.com/@luxecardafrica?si=1B4uRTZM-azApecU',
  },
  LEGAL: {
    privacy: '/privacy',
    terms: '/terms',
    returns: '/returns',
  },
} as const;
