/**
 * ─────────────────────────────────────────────────────────────
 *  SKJERMOPPSETT
 *  Her bestemmer du hva hver skjerm viser og i hvilken rekkefølge.
 *  Hver skjerm har sin egen URL:  /skjerm/<id>
 *  `seconds` = hvor lenge sliden vises før neste.
 *  Endre, lagre, push til GitHub → Vercel deployer, og skjermene
 *  laster seg selv på nytt innen et par minutter.
 * ─────────────────────────────────────────────────────────────
 */

import type { Screen } from "./types";

// Felles steder – bytt til kontorets adresse/holdeplass.
// Finn holdeplass-ID (NSR:StopPlace:xxxx) på https://stoppested.entur.org
// Kontoret: Hovfaret 17 A, 0275 Oslo
const VAER = { place: "Hovfaret, Skøyen", lat: 59.9268, lon: 10.6768 };

// Holdeplasser nær kontoret: Hoff (165 m, trikk + buss), Skøyen stasjon (ca. 450 m), Thune (ca. 780 m)
const SENTRUM = ["Nationaltheatret", "Oslo S", "Jernbanetorget"];
const AVGANGER = {
  type: "departures" as const,
  title: "Avganger i nærheten",
  // Kolonner: tog | Hamar-boks + trikk | buss
  columns: [[0], [3, 1], [2]],
  walkFrom: { lat: 59.926763, lon: 10.6768 }, // Hovfaret 17 A
  boards: [
    { title: "Tog mot sentrum", stopId: "NSR:StopPlace:59651", modes: ["rail" as const], towards: SENTRUM, max: 8 },
    // Trikken er erstattet av buss 13B/13E mellom Thune og Lilleaker til januar 2027 – da brukes Thune automatisk
    {
      title: "Trikk mot sentrum",
      stopId: "NSR:StopPlace:58286", // Hoff
      fallbackStopIds: ["NSR:StopPlace:58287", "NSR:StopPlace:58288"], // Skøyen, Thune
      modes: ["tram" as const],
      towards: SENTRUM,
      max: 2,
    },
    { title: "Buss", stopId: "NSR:StopPlace:58286", modes: ["bus" as const], max: 6 },
    {
      title: "Neste tog til Hamar",
      stopId: "NSR:StopPlace:59651", // Skøyen stasjon
      modes: ["rail" as const],
      trip: { toStopId: "NSR:StopPlace:60045", toName: "Hamar", count: 2 }, // Hamar stasjon
    },
  ],
};

// Nyhetskilder (RSS). Flere URL-er = reserver som prøves i rekkefølge.
const NRK = { name: "NRK", urls: ["https://www.nrk.no/toppsaker.rss"] };
// NRK har ingen egen økonomifeed – E24 brukes for økonominytt
const E24 = { name: "E24", urls: ["https://e24.no/rss2/", "https://e24.no/rss", "https://e24.no/rss2/?seksjon=boers-og-finans"] };
const FINANSAVISEN = {
  name: "Finansavisen",
  urls: ["https://ws.finansavisen.no/api/articles.rss", "https://www.finansavisen.no/rss"],
};

// K.A. Rasmussen AS, Birkebeinervegen 24, 2316 Hamar
const HAMAR = { lat: 60.801473, lon: 11.029342 };
const AVGANGER_HAMAR = {
  type: "departures" as const,
  title: "Avganger i nærheten",
  walkFrom: HAMAR,
  boards: [
    { title: "Buss B25", stopId: "NSR:StopPlace:59711", fallbackStopIds: ["NSR:StopPlace:59708"], modes: ["bus" as const], max: 5 }, // Arvid Østbys veg
    { title: "Buss B21", stopId: "NSR:StopPlace:10650", modes: ["bus" as const], max: 5 }, // Kornsiloen
    { title: "Tog", stopId: "NSR:StopPlace:60045", modes: ["rail" as const], max: 5, walk: false }, // Hamar stasjon (ca. 3 km)
  ],
};

export const SCREENS: Record<string, Screen> = {
  "kontor-1": {
    name: "Skøyen",
    private: false,
    slides: [
      { type: "buyprices", seconds: 30, title: "I dag kjøper vi for", url: "https://karasmussen.com/metallpriser/" },
      { type: "news", seconds: 25, title: "Økonominytt", feeds: [E24, FINANSAVISEN] },
      { type: "weather", seconds: 20, ...VAER },
      { ...AVGANGER, seconds: 25 },
      {
        type: "traffic",
        seconds: 25,
        title: "Vei og trafikk",
        from: { lat: 59.926763, lon: 10.6768 }, // Hovfaret 17 A
        destinations: [
          { name: "Helsfyr", lat: 59.9128, lon: 10.8008 },
          { name: "Lørenskog", lat: 59.9285, lon: 10.958 },
          { name: "Ski", lat: 59.7194, lon: 10.8357 },
          { name: "Drammen", lat: 59.74, lon: 10.204 },
        ],
        roads: [
          { label: "Ring 3", match: "ring ?3|\\b(rv|riksveg|riksvei) ?150\\b|(^|\\D)150(\\D|$)" },
          { label: "E18", match: "e ?18\\b|(^|\\D)18(\\D|$)" },
          { label: "E6", match: "e ?6\\b|(^|\\D)6(\\D|$)" },
        ],
        bbox: [59.7, 10.2, 60.0, 11.0], // Oslo, Bærum, Asker, Lillestrøm og Follo
      },
      {
        type: "ski",
        seconds: 25,
        title: "Skiføre i marka",
        place: "Tryvann",
        lat: 59.9972,
        lon: 10.6689,
        altitude: 418,
        utm: { x: 258516, y: 6659009 },
        webcam: {
          url: "https://www.yr.no/webcams/1/600/tryvann/1.jpg",
          label: "Tryvann, retning nordvest",
          credit: "Webkamera: MET Norway / Yr",
        },
      },
    ],
  },

  "kontor-2": {
    name: "Tall og trender",
    // Interne tall: krever ?key=<SCREEN_KEY> i URL-en
    private: true,
    slides: [
      {
        type: "ga4",
        seconds: 25,
        title: "Nettsiden – siste 7 dager",
        // Bestillinger av returpose som GA4 har registrert (hendelsen «Få en gratis verdivurdering her»).
        // Faktisk antall bestillinger er høyere – ikke alle blir sporet. Bytt hendelse når sporingen er forbedret.
        formEvent: {
          name: "Få en gratis verdivurdering her",
          label: "Bestilte returposer",
          note: "Kun bestillinger sporet i GA4 – faktisk antall er høyere",
        },
      },
      { type: "markets", seconds: 25, title: "Metallpriser og valuta" },
      { type: "meta", seconds: 25, title: "Meta-annonser – siste 7 dager" },
      { type: "iframe", seconds: 30, title: "Power BI", urlEnv: "POWERBI_EMBED_URL" },
    ],
  },

  "resep-hamar": {
    name: "Hamar",
    private: false,
    slides: [
      { type: "markets", seconds: 25, title: "Metallpriser og valuta" },
      { type: "buyprices", seconds: 30, title: "I dag kjøper vi for", url: "https://karasmussen.com/metallpriser/" },
      { type: "weather", seconds: 15, place: "Hamar", ...HAMAR },
      { ...AVGANGER_HAMAR, seconds: 20 },
      { type: "youtube", seconds: 90, videoId: "3gt7pYNpj-Y" },
    ],
  },

  publikum: {
    name: "Velkommen",
    private: false,
    slides: [
      { type: "youtube", seconds: 60, videoIdEnv: "YOUTUBE_VIDEO_ID" },
      { ...AVGANGER, seconds: 20 },
      { type: "weather", seconds: 15, ...VAER },
      { type: "markets", seconds: 20, title: "Dagens metallpriser" },
      { type: "news", seconds: 20, title: "Siste nytt", feeds: [NRK] },
    ],
  },
};
