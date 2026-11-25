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
        columns: slide.columns,
        boards: slide.boards.map((b) => {
          if (b.trip)
            return {
              title: b.title,
              stopName: "Skøyen stasjon",
              departures: [],
              notices: [],
              walkMinutes: 9,
              toName: b.trip.toName,
              trips: [
                { start: iso(14), aimedStart: iso(14), end: iso(96), minutes: 82, lines: ["RE10"], changes: 0, platform: "4", realtime: true },
                { start: iso(74), aimedStart: iso(74), end: iso(154), minutes: 80, lines: ["L2", "R10"], changes: 1, via: "Oslo S", platform: "3", realtime: false },
              ],
            };
          const mode = b.modes?.[0] ?? "bus";
          const rows: [string, string][] =
            mode === "rail"
              ? [["L1", "Lillestrøm"], ["R13", "Dal"], ["L2", "Ski"], ["RE10", "Lillehammer"], ["L1", "Lillestrøm"], ["FLY2", "Oslo lufthavn"], ["R14", "Kongsvinger"], ["L2", "Ski"]]
              : mode === "tram"
                ? [["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"], ["13", "Ljabru"]]
                : [["31", "Snarøya"], ["31", "Tonsenhagen"], ["20", "Skøyen"], ["31", "Snarøya"], ["20", "Galgeberg"], ["40", "Øvre Sogn"]];
          return {
            title: b.title,
            stopName: b.stopId,
            walkMinutes: b.walk === false ? undefined : mode === "rail" ? 6 : mode === "tram" ? 10 : 3,
            notices:
              mode === "tram"
                ? ["Linje 13: Buss for trikk direkte mellom Thune og Furulund - Lilleaker", "Linje 13: Buss for trikk mellom Thune og Lilleaker"]
                : mode === "bus"
                  ? ["Holdeplass Ullern retning Lilleaker er flyttet cirka 50 meter bakover på grunn av vegarbeid i området fram til mars"]
                  : ["Færre vogner", "Innstilte avganger mellom Asker og Lysaker"],
            departures: rows.slice(0, b.max ?? 8).map(([line, destination], i) => ({
              line,
              mode,
              destination,
              aimed: iso(2 + i * 4),
              expected: iso(2 + i * 4 + (i === 1 ? 2 : 0)),
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
        ].map((title, i) => ({
          title,
          lead: "Eksempel på ingress: en kort oppsummering av saken som gir leseren nok kontekst til å forstå hva den handler om, uten å måtte lese hele artikkelen.",
          source: names[i % names.length],
          published: iso(-i * 37),
        })),
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
          { code: "USD", label: "1 USD", rate: 9.8076, date: day(-1), changeDay: 0.56, changeWeek: 1.1, kroneDay: -0.56, kroneWeek: -1.09, fetchedAt: iso(-20) },
          { code: "EUR", label: "1 EUR", rate: 10.7285, date: day(-1), changeDay: 0.1, changeWeek: 0.4, kroneDay: -0.1, kroneWeek: -0.4, fetchedAt: iso(-20) },
          { code: "SEK", label: "100 SEK", rate: 95.47, date: day(-1), changeDay: -0.13, changeWeek: -0.2, kroneDay: 0.13, kroneWeek: 0.2, fetchedAt: iso(-20) },
        ],
        krone: { value: 110.98, date: day(-1), kroneDay: -0.22, kroneWeek: -1.3, fetchedAt: iso(-20) },
      };
    }
    case "ski":
      return {
        place: slide.place,
        altitude: slide.altitude,
        snowDepth: 14.4,
        snowDepthWeekAgo: 15.7,
        newSnow3d: 0,
        condition: "Tørr snø",
        wax: { grip: "Blå klister", glide: "middels (fiolett)", why: "Gammel, frossen snø · −6 °C" },
        days: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({ date: day(i - 7), snowDepth: [15.7, 15.4, 15.2, 15, 14.8, 14.6, 14.5, 14.4, 14.3, 15.5, 15.4][i], forecast: i > 7 })),
        weather: {
          place: slide.place,
          now: { temp: -5.6, wind: 2.1, symbol: "clearsky_day", precip: 0 },
          hours: [],
          days: [1, 2, 3].map((n, i) => ({ date: day(n), min: -9 + i, max: -4 + i, symbol: ["clearsky_day", "lightsnow", "cloudy"][i], precip: [0, 1.4, 0][i] })),
        },
        webcam: slide.webcam && { src: slide.webcam.url, label: slide.webcam.label, credit: slide.webcam.credit, takenAt: iso(-8) },
      };
    case "traffic":
      return {
        trips: [
          { name: "Helsfyr", minutes: 17, normalMinutes: 13, delayMinutes: 4, km: 11.2 },
          { name: "Lørenskog", minutes: 24, normalMinutes: 20, delayMinutes: 4, km: 20.1 },
          { name: "Ski", minutes: 29, normalMinutes: 27, delayMinutes: 2, km: 31.5 },
          { name: "Drammen", minutes: 49, normalMinutes: 35, delayMinutes: 14, km: 37.8 },
        ],
        messages: [
          { road: "E18", type: "Kø", text: "E18 Lysaker – Sandvika, retning Drammen: Kø på grunn av stor trafikk.", updated: iso(-6) },
          { road: "Ring 3", type: "Vegarbeid", text: "Rv150 Ring 3 Ullevål – Tåsen: Ett felt stengt i retning Ryen på grunn av vegarbeid.", updated: iso(-48) },
          { road: "E6", type: "Ulykke", text: "E6 Klemetsrud, retning sør: Trafikkulykke, vis hensyn.", updated: iso(-15) },
        ],
      };
    case "buyprices": {
      const it = (name: string, price: number, unit: string) => ({ name, price, unit });
      return {
        groups: [
          { title: "Gull", unit: "g", items: [it("Fintgullbarre Sirkulert", 1081, "g"), it("Gull 999 - 24K", 1005, "g"), it("Gull 916 - 22K", 790, "g"), it("Gull 750 - 18K", 647, "g"), it("Gull 585 - 14K", 513, "g"), it("Gull 10K", 353, "g"), it("Gull 375 - 9K", 327, "g"), it("Gull 333 - 8K", 290, "g")] },
          { title: "Sølv", unit: "kg", items: [it("Sirkulert Fintsølvbarre", 12212, "kg"), it("999 Fintsølv", 8014, "kg"), it("925 Sølv", 7413, "kg"), it("830 Sølv", 6652, "kg")] },
          { title: "Mynter og barrer", unit: "stk", items: [it("1 oz Sirkulert Viking Eric Bloodaxe Gullmynt", 34133, "stk"), it("1 oz Sirkulert Viking Harald Hårfagre Gullmynt", 34133, "stk"), it("1 oz Sirkulert Maple Leaf Gullmynt", 33960, "stk"), it("1/2 oz Sirkulert Maple Leaf Gullmynt", 16980, "stk"), it("1/2 oz Sirkulert Alt For Norge Gullmynt", 16460, "stk"), it("1 kg Sirk. Viking Eric Bloodaxe Sølv Myntbarre", 12530, "stk"), it("Sirkulert Britisk Sovereign Gullmynt", 7750, "stk"), it("1/10 oz Sirkulert American Eagle Gullmynt", 3396, "stk"), it("250 g Sirkulert St. Helena East India Comp", 3117, "stk"), it("2 oz Sirkulert Tudor Beasts Yale Of Beauf Sølvmynt", 776, "stk"), it("1 oz Sirkulert Maple Leaf Sølvmynt", 388, "stk")] },
        ],
        updated: "25/11 kl 08:08 GMT",
        fetchedAt: iso(-3),
      };
    }
    default:
      return null;
  }
}
