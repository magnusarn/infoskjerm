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
const NRK_OKONOMI = {
  name: "NRK",
  urls: [
    "https://www.nrk.no/okonomi/toppsaker.rss",
    "https://www.nrk.no/okonomi/siste.rss",
    "https://www.nrk.no/nyheter/okonomi/siste.rss",
    "https://www.nrk.no/nyttig/toppsaker.rss",
  ],
};
const FINANSAVISEN = {
  name: "Finansavisen",
  urls: ["https://ws.finansavisen.no/api/articles.rss", "https://www.finansavisen.no/rss"],
};

export const SCREENS: Record<string, Screen> = {
  "kontor-1": {
    name: "Kontor",
    private: false,
    slides: [
      { type: "weather", seconds: 20, ...VAER },
      { ...AVGANGER, seconds: 25 },
      { type: "news", seconds: 25, title: "Økonominytt", feeds: [NRK_OKONOMI, FINANSAVISEN] },
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
      { type: "news", seconds: 20, title: "Siste nytt", feeds: [NRK] },
    ],
  },
};
