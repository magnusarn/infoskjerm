type Base = { seconds: number };

export type WeatherSlide = Base & { type: "weather"; place: string; lat: number; lon: number };
/** Én avgangstavle: én holdeplass, eventuelt filtrert på transportmiddel og retning */
export type Board = {
  title: string;
  /** NSR:StopPlace:xxxx – finn den på https://stoppested.entur.org */
  stopId: string;
  /** Bare disse transportmidlene, f.eks. ["rail"], ["tram"], ["bus"] */
  modes?: ("bus" | "tram" | "rail" | "metro" | "water" | "coach")[];
  /** Bare avganger som senere stopper på en av disse holdeplassene (navn), f.eks. ["Nationaltheatret"] */
  towards?: string[];
  max?: number;
};
export type DeparturesSlide = Base & { type: "departures"; title?: string; boards: Board[] };
export type CalendarSlide = Base & { type: "calendar"; title: string; days?: number };
export type NewsSlide = Base & { type: "news"; title: string; feedUrl: string; sourceName: string };
export type Ga4Slide = Base & { type: "ga4"; title: string };
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
  | MessageSlide;

export type Screen = { name: string; private: boolean; slides: Slide[] };

/** Slide-typer som henter data fra /api/data */
export const DATA_TYPES = ["weather", "departures", "calendar", "news", "ga4", "meta"] as const;

/** Hvor ofte (sekunder) data for hver type hentes på nytt i nettleseren */
export const REFRESH: Record<string, number> = {
  weather: 30 * 60,
  departures: 30,
  calendar: 5 * 60,
  news: 10 * 60,
  ga4: 15 * 60,
  meta: 30 * 60,
};
