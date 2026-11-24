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

// Holdeplasser nær kontoret: Hoff (165 m, trikk + buss) og Skøyen stasjon (ca. 450 m)
const SENTRUM = ["Nationaltheatret", "Oslo S", "Jernbanetorget"];
const AVGANGER = {
  type: "departures" as const,
  title: "Avganger i nærheten",
  boards: [
    { title: "Tog mot sentrum", stopId: "NSR:StopPlace:59651", modes: ["rail" as const], towards: SENTRUM, max: 5 },
    { title: "Trikk mot sentrum", stopId: "NSR:StopPlace:58286", modes: ["tram" as const], towards: SENTRUM, max: 5 },
    { title: "Buss", stopId: "NSR:StopPlace:58286", modes: ["bus" as const], max: 5 },
  ],
};

export const SCREENS: Record<string, Screen> = {
  "kontor-1": {
    name: "Kontor",
    private: false,
    slides: [
      { type: "weather", seconds: 20, ...VAER },
      { ...AVGANGER, seconds: 25 },
      { type: "calendar", seconds: 20, title: "Denne uka", days: 7 },
    ],
  },

  "kontor-2": {
    name: "Tall og trender",
    // Interne tall: krever ?key=<SCREEN_KEY> i URL-en
    private: true,
    slides: [
      { type: "ga4", seconds: 25, title: "Nettsiden – siste 7 dager" },
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
      {
        type: "news",
        seconds: 20,
        title: "Siste nytt",
        feedUrl: "https://www.nrk.no/toppsaker.rss",
        sourceName: "NRK",
      },
    ],
  },
};
