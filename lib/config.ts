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
const OSLO = { place: "Oslo", lat: 59.9139, lon: 10.7522 };
const HOLDEPLASS = { stopId: "NSR:StopPlace:337", stopName: "Oslo S" };

export const SCREENS: Record<string, Screen> = {
  "kontor-1": {
    name: "Kontor",
    private: false,
    slides: [
      { type: "weather", seconds: 20, ...OSLO },
      { type: "departures", seconds: 20, ...HOLDEPLASS },
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
      { type: "departures", seconds: 15, ...HOLDEPLASS },
      { type: "weather", seconds: 15, ...OSLO },
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
