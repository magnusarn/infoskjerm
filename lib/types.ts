type Base = { seconds: number };

export type WeatherSlide = Base & { type: "weather"; place: string; lat: number; lon: number; altitude?: number };
/** Én avgangstavle: én holdeplass, eventuelt filtrert på transportmiddel og retning */
export type Board = {
  title: string;
  /** NSR:StopPlace:xxxx – finn den på https://stoppested.entur.org */
  stopId: string;
  /** Reserveholdeplasser i prioritert rekkefølge – brukes hvis stopId ikke har avganger (f.eks. ved buss for trikk) */
  fallbackStopIds?: string[];
  /** Bare disse transportmidlene, f.eks. ["rail"], ["tram"], ["bus"] */
  modes?: ("bus" | "tram" | "rail" | "metro" | "water" | "coach")[];
  /** Bare avganger som senere stopper på en av disse holdeplassene (navn), f.eks. ["Nationaltheatret"] */
  towards?: string[];
  max?: number;
  /** Sett til false for å skjule gangtid (f.eks. en stasjon som ligger langt unna) */
  walk?: boolean;
  /** Gjør tavla til en reiseboks: neste reiser fra stopId til denne holdeplassen (f.eks. «Neste tog til Hamar») */
  trip?: { toStopId: string; toName: string; count?: number };
};
export type DeparturesSlide = Base & {
  type: "departures";
  title?: string;
  boards: Board[];
  /** Valgfri plassering: hvilke tavler (indekser i boards) som står i hver kolonne, stablet ovenfra */
  columns?: number[][];
  /** Startpunkt for gangtid til holdeplassene (kontoret) */
  walkFrom?: { lat: number; lon: number };
};
export type CalendarSlide = Base & { type: "calendar"; title: string; days?: number };
/** Én nyhetskilde. `urls` prøves i rekkefølge – første som svarer brukes. */
export type Feed = { name: string; urls: string[] };
export type NewsSlide = Base & { type: "news"; title: string; feeds: Feed[]; max?: number };
export type Ga4Slide = Base & {
  type: "ga4";
  title: string;
  /** Hendelsen som telles som «innsendte skjemaer». Uten denne vises alle nøkkelhendelser. */
  formEvent?: { name: string; label: string; note?: string };
};
export type MetaSlide = Base & { type: "meta"; title: string };
/** Power BI «Publish to web», Looker Studio-embed eller annen side som tillater iframe */
export type IframeSlide = Base & { type: "iframe"; title: string; url?: string; urlEnv?: string };
export type YoutubeSlide = Base & {
  type: "youtube";
  videoId?: string;
  playlistId?: string;
  videoIdEnv?: string;
};
export type ImageSlide = Base & { type: "image"; src: string; alt?: string };
/** Skiføre: snø fra NVE (seNorge), vær fra MET og webkamerabilde */
export type SkiSlide = Base & {
  type: "ski";
  title: string;
  place: string;
  lat: number;
  lon: number;
  altitude: number;
  /** UTM sone 33 (EPSG:25833) – NVE sitt rutenett */
  utm: { x: number; y: number };
  webcam?: { url: string; label: string; credit: string };
};
/** Vei og trafikk: reisetid med trafikk (TomTom) og trafikkmeldinger (Statens vegvesen DATEX) */
export type TrafficSlide = Base & {
  type: "traffic";
  title: string;
  from: { lat: number; lon: number };
  destinations: { name: string; lat: number; lon: number }[];
  /** Veier vi viser meldinger for, med mønster som matcher vegnummer/navn i meldingene */
  roads: { label: string; match: string }[];
  /** Område meldingene må ligge innenfor: [minLat, minLon, maxLat, maxLon] */
  bbox: [number, number, number, number];
};
/** «I dag kjøper vi for» – innkjøpspriser fra karasmussen.com */
export type BuyPricesSlide = Base & { type: "buyprices"; title: string; url: string };
export type MarketsSlide = Base & { type: "markets"; title: string };
export type MessageSlide = Base & { type: "message"; heading: string; text?: string };

export type Slide =
  | WeatherSlide
  | DeparturesSlide
  | CalendarSlide
  | NewsSlide
  | Ga4Slide
  | MetaSlide
  | IframeSlide
  | YoutubeSlide
  | ImageSlide
  | MessageSlide
  | MarketsSlide
  | SkiSlide
  | TrafficSlide
  | BuyPricesSlide;

export type Screen = {
  name: string;
  private: boolean;
  slides: Slide[];
  /**
   * Julelysslynge i toppen (vises 20. nov – 6. jan).
   * fasten: hvor slyngen er festet med granbar. Siden uten granbar fortsetter på TV-en ved siden av.
   * offset: lyspærenummeret slyngen starter på, så fargene fortsetter fra nabo-TV-en (24 per skjerm).
   */
  xmas?: { fasten: "left" | "right" | "both"; offset?: number };
};

/** Slide-typer som henter data fra /api/data */
export const DATA_TYPES = ["weather", "departures", "calendar", "news", "ga4", "meta", "markets", "ski", "traffic", "buyprices"] as const;

/** Hvor ofte (sekunder) data for hver type hentes på nytt i nettleseren */
export const REFRESH: Record<string, number> = {
  weather: 30 * 60,
  departures: 30,
  calendar: 5 * 60,
  news: 10 * 60,
  ga4: 15 * 60,
  meta: 30 * 60,
  markets: 2 * 60,
  ski: 10 * 60,
  traffic: 5 * 60,
  buyprices: 10 * 60,
};
