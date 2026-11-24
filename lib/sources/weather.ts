import type { WeatherSlide } from "../types";

// MET krever en identifiserende User-Agent med kontaktinfo.
// Sett MET_USER_AGENT i Vercel, f.eks. "infoskjerm/1.0 navn@firma.no"
const UA = process.env.MET_USER_AGENT || "infoskjerm-poc/0.1 github.com/infoskjerm";

export type WeatherData = {
  place: string;
  now: { temp: number; wind: number; symbol: string; precip: number };
  hours: { time: string; temp: number; symbol: string; precip: number }[];
  days: { date: string; min: number; max: number; symbol: string; precip: number }[];
};

type TS = {
  time: string;
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } };
    next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } };
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } };
  };
};

const osloDate = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }); // YYYY-MM-DD
const osloHour = (d: Date) => Number(d.toLocaleString("en-GB", { timeZone: "Europe/Oslo", hour: "2-digit", hourCycle: "h23" }));

export async function getWeather(s: WeatherSlide): Promise<WeatherData> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${s.lat.toFixed(4)}&lon=${s.lon.toFixed(4)}`;
  // MET: minst 30 min caching for steder i Norden
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`MET svarte ${res.status}`);
  const json = await res.json();
  const series: TS[] = json.properties.timeseries;

  const nowIdx = Math.max(0, series.findIndex((t) => new Date(t.time).getTime() > Date.now() - 3600_000));
  const cur = series[nowIdx];
  const sym = (t: TS) => t.data.next_1_hours?.summary.symbol_code ?? t.data.next_6_hours?.summary.symbol_code ?? "cloudy";
  const pr = (t: TS) => t.data.next_1_hours?.details.precipitation_amount ?? 0;

  const hours = series
    .slice(nowIdx + 1, nowIdx + 13)
    .filter((_, i) => i % 2 === 0)
    .map((t) => ({ time: t.time, temp: t.data.instant.details.air_temperature, symbol: sym(t), precip: pr(t) }));

  const byDay = new Map<string, TS[]>();
  for (const t of series) {
    const d = osloDate(new Date(t.time));
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(t);
  }
  const today = osloDate(new Date());
  const days = [...byDay.entries()]
    .filter(([d]) => d > today)
    .slice(0, 5)
    .map(([date, list]) => {
      const temps = list.map((t) => t.data.instant.details.air_temperature);
      const mid =
        list.find((t) => osloHour(new Date(t.time)) >= 12 && t.data.next_6_hours) ??
        list.find((t) => t.data.next_6_hours) ??
        list[0];
      const precip = list
        .filter((t) => [0, 6, 12, 18].includes(osloHour(new Date(t.time))))
        .reduce((a, t) => a + (t.data.next_6_hours?.details.precipitation_amount ?? 0), 0);
      return {
        date,
        min: Math.min(...temps),
        max: Math.max(...temps),
        symbol: mid.data.next_6_hours?.summary.symbol_code ?? sym(mid),
        precip: Math.round(precip * 10) / 10,
      };
    });

  return {
    place: s.place,
    now: {
      temp: cur.data.instant.details.air_temperature,
      wind: cur.data.instant.details.wind_speed,
      symbol: sym(cur),
      precip: pr(cur),
    },
    hours,
    days,
  };
}
