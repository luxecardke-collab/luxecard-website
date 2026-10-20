// LuxeCard as a local business (the shop in Lavington), for the structured
// data search engines read (src/seo/structuredData.ts). Only details the
// site already shows: the address in "Find us" (ContactVisit) and the pin
// on its map (LINKS.MAP_EMBED_SRC).

export const BUSINESS_ADDRESS = {
  streetAddress: '124 Manyani East Road, Lavington',
  addressLocality: 'Nairobi',
  addressCountry: 'KE',
};

// The map pin's coordinates (Google Maps, "LuxeCard Africa, 124 Manyani E Rd").
export const BUSINESS_GEO = { latitude: -1.261213, longitude: 36.7711506 };

// Opening hours: left out of the structured data while empty. List each set
// of days with the same hours, e.g.
//   { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
//   { days: ['Saturday'], opens: '10:00', closes: '16:00' },
// (24-hour times, East Africa Time). A day left out of every entry reads as
// closed that day.
export type OpeningHours = {
  days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  opens: string;
  closes: string;
};
export const OPENING_HOURS: OpeningHours[] = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '17:00' },
];
