/** Eksempeldata for ?demo=1 – nyttig for å se oppsettet før nøkler er på plass. */
import type { Slide } from "./types";

const iso = (minFromNow: number) => new Date(Date.now() + minFromNow * 60_000).toISOString();
const day = (n: number) => {
  const d = new Date(Date.now() + n * 86400_000);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
};

export function demoData(slide: Slide): unknown {
  switch (slide.type) {
    case "weather":
      return {
        place: slide.place,
        now: { temp: -3.4, wind: 3.2, symbol: "partlycloudy_day", precip: 0 },
        hours: [0, 2, 4, 6, 8, 10].map((h, i) => ({
          time: iso(60 + h * 60),
          temp: -3 + i * 0.6,
          symbol: ["partlycloudy_day", "cloudy", "lightsnow", "snow", "cloudy", "fair_night"][i],
          precip: [0, 0, 0.3, 1.1, 0.2, 0][i],
        })),
        days: [1, 2, 3, 4, 5].map((n, i) => ({
          date: day(n),
          min: -6 + i,
          max: -1 + i,
          symbol: ["snow", "cloudy", "clearsky_day", "rain", "partlycloudy_day"][i],
          precip: [4.2, 0.4, 0, 6.1, 0.8][i],
        })),
      };
    case "departures":
      return {
        title: slide.title,
        boards: slide.boards.map((b) => {
          const mode = b.modes?.[0] ?? "bus";
          const rows: [string, string][] =
            mode === "rail"
              ? [["L1", "Lillestrøm"], ["R13", "Dal"], ["L2", "Ski"], ["RE11", "Skien"], ["L1", "Lillestrøm"]]
              : mode === "tram"
                ? [["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"]]
                : [["31", "Snarøya"], ["31", "Tonsenhagen"], ["20", "Skøyen"], ["31", "Snarøya"], ["20", "Galgeberg"]];
          return {
            title: b.title,
            stopName: b.stopId,
            notices: mode === "tram" ? ["Buss erstatter trikken mellom Thune og Lilleaker fram til januar 2027."] : [],
            departures: rows.slice(0, b.max ?? 8).map(([line, destination], i) => ({
              line,
              mode,
              destination,
              aimed: iso(2 + i * 5),
              expected: iso(2 + i * 5 + (i === 1 ? 2 : 0)),
              realtime: i !== 4,
              cancelled: false,
              platform: String((i % 2) + 1),
            })),
          };
        }),
      };
    case "calendar":
      return {
        events: [
          ["Mandagsmøte", 0, 9, 9.5, false],
          ["Kampanjegjennomgang Q1", 0, 13, 14, false],
          ["Lunsj med leverandør", 1, 11.5, 12.5, false],
          ["Fagdag gull og sølv", 2, 0, 24, true],
          ["Salgsmøte Sverige", 3, 10, 11, false],
          ["Fredagspils", 4, 15, 17, false],
        ].map(([title, d, s, e, allDay]) => {
          const base = new Date();
          base.setHours(0, 0, 0, 0);
          const start = new Date(+base + (d as number) * 86400_000 + (s as number) * 3600_000);
          const end = new Date(+base + (d as number) * 86400_000 + (e as number) * 3600_000);
          return { title, start: start.toISOString(), end: end.toISOString(), allDay };
        }),
      };
    case "news": {
      const names = slide.feeds.map((f) => f.name);
      return {
        sources: names,
        items: [
          "Eksempel: Gullprisen satte ny rekord i natt",
          "Eksempel: Norges Bank holder renten uendret",
          "Eksempel: Oslo Børs stiger etter sterke tall fra Equinor",
          "Eksempel: Kronen styrker seg mot euro",
          "Eksempel: Julehandelen ventes å slå fjorårets rekord",
          "Eksempel: Boligprisene flater ut i Oslo",
        ].map((title, i) => ({ title, source: names[i % names.length], published: iso(-i * 37) })),
      };
    }
    case "ga4":
      return {
        kpis: {
          users: { value: 18432, previous: 16120 },
          sessions: { value: 24987, previous: 23410 },
          keyEvents: { value: 412, previous: 455 },
          views: { value: 71230, previous: 64011 },
        },
        daily: [3120, 3480, 3610, 3390, 3720, 3900, 3767].map((sessions, i) => ({
          date: day(i - 7).replaceAll("-", ""),
          sessions,
        })),
        topPages: [
          ["/", 12400],
          ["/selg-gull", 8210],
          ["/gullpris", 6904],
          ["/kjop-gullbarrer", 4380],
          ["/kontakt", 2110],
        ].map(([path, views]) => ({ path, views })),
        channels: [
          ["Organic Search", 10230],
          ["Paid Search", 6120],
          ["Direct", 4210],
          ["Paid Social", 2650],
          ["Referral", 1020],
          ["Email", 757],
        ].map(([name, sessions]) => ({ name, sessions })),
      };
    case "meta":
      return {
        currency: "NOK",
        cur: { spend: 18450, impressions: 642000, reach: 211000, clicks: 7420, ctr: 1.16, cpc: 2.49 },
        prev: { spend: 16900, impressions: 590000, reach: 198000, clicks: 6100, ctr: 1.03, cpc: 2.77 },
        campaigns: [
          ["Selg gull – jul", 7200, 251000, 3310],
          ["Investering – retargeting", 4800, 140000, 1650],
          ["Merkevare – video", 3900, 190000, 1210],
          ["Gullsmed – lokalt", 2550, 61000, 1250],
        ].map(([name, spend, impressions, clicks]) => ({ name, spend, impressions, clicks })),
      };
    case "markets": {
      const hist = (start: number, n = 30) =>
        Array.from({ length: n }, (_, i) => ({ date: day(i - n), price: start * (1 + Math.sin(i / 4) * 0.04 + i * 0.002) }));
      return {
        metals: [
          { code: "XAU", name: "Gull", price: 1145.34, unit: "g", changeToday: 0.7, changeWeek: -4.85, history: hist(1100), fetchedAt: iso(-1) },
          { code: "XAG", name: "Sølv", price: 13365, unit: "kg", changeToday: 0.03, changeWeek: -9.2, history: hist(13000), fetchedAt: iso(-1) },
        ],
        fx: [
          { code: "USD", label: "1 USD", rate: 9.8076, date: day(-1), changeDay: 0.56, changeWeek: 1.1, fetchedAt: iso(-20) },
          { code: "EUR", label: "1 EUR", rate: 10.7285, date: day(-1), changeDay: 0.1, changeWeek: 0.4, fetchedAt: iso(-20) },
          { code: "SEK", label: "100 SEK", rate: 95.47, date: day(-1), changeDay: -0.13, changeWeek: -0.2, fetchedAt: iso(-20) },
        ],
      };
    }
    default:
      return null;
  }
}
