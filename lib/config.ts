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
  walkFrom: { lat: 59.926763, lon: 10.6768 }, // Hovfaret 17 A
  boards: [
    { title: "Tog mot sentrum", stopId: "NSR:StopPlace:59651", modes: ["rail" as const], towards: SENTRUM, max: 5 },
    // Trikken er erstattet av buss 13B/13E mellom Thune og Lilleaker til januar 2027 – da brukes Thune automatisk
    {
      title: "Trikk mot sentrum",
      stopId: "NSR:StopPlace:58286", // Hoff
      fallbackStopIds: ["NSR:StopPlace:58287", "NSR:StopPlace:58288"], // Skøyen, Thune
      modes: ["tram" as const],
      towards: SENTRUM,
      max: 5,
    },
    { title: "Buss", stopId: "NSR:StopPlace:58286", modes: ["bus" as const], max: 5 },
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

export const SCREENS: Record<string, Screen> = {
  "kontor-1": {
    name: "Skøyen",
    private: false,
    slides: [
      { type: "weather", seconds: 20, ...VAER },
      { ...AVGANGER, seconds: 25 },
      { type: "news", seconds: 25, title: "Økonominytt", feeds: [E24, FINANSAVISEN] },
      { type: "markets", seconds: 25, title: "Metallpriser og valuta" },
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
      { type: "meta", seconds: 25, title: "Meta-annonser – siste 7 dager" },
      { type: "iframe", seconds: 30, title: "Power BI", urlEnv: "POWERBI_EMBED_URL" },
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
