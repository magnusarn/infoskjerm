/**
 * Skiføre i marka
 * - Snø: NVE sitt åpne GridTimeSeries-API (seNorge-modellen), ingen nøkkel. Gir også prognose noen dager fram.
 * - Vær: MET Locationforecast (samme som værsliden), med høyde over havet.
 * - Webkamera: siste bilde, hentes via /api/webcam så TV-ene ikke henter direkte fra kilden.
 */
import type { SkiSlide } from "../types";
import { getWeather, type WeatherData } from "./weather";

export type SkiDay = { date: string; snowDepth: number | null; forecast: boolean };
export type SkiData =
  | {
      place: string;
      altitude: number;
      snowDepth: number;
      snowDepthWeekAgo: number | null;
      newSnow3d: number;
      condition: string;
      days: SkiDay[];
      weather?: WeatherData;
      webcam?: { src: string; label: string; credit: string; takenAt?: string };
    }
  | { notConfigured: true; hint: string };

const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
const NODATA = 65535;

async function nve(s: SkiSlide, theme: string, from: string, to: string): Promise<(number | null)[]> {
  const res = await fetch(`https://gts.nve.no/api/GridTimeSeries/${s.utm.x}/${s.utm.y}/${from}/${to}/${theme}.json`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`NVE svarte ${res.status} (${theme})`);
  const j = await res.json();
  return (j.Data as number[]).map((v) => (v === NODATA || v === j.NoDataValue ? null : v));
}

function describe(lwc: number | null, depth: number) {
  if (depth < 1) return "Ingen snø";
  if (lwc === null) return "";
  if (lwc <= 0.2) return "Tørr snø";
  if (lwc < 3) return "Fuktig snø";
  return "Våt snø";
}

export async function getSki(s: SkiSlide, origin: { screen: string; i: number }): Promise<SkiData> {
  const today = new Date();
  const start = new Date(+today - 7 * 86400_000);
  const end = new Date(+today + 3 * 86400_000);
  const [from, to] = [ymd(start), ymd(end)];

  const [sd, fsw3d, lwc] = await Promise.all([nve(s, "sd", from, to), nve(s, "sdfsw3d", from, to), nve(s, "lwc", from, to)]);
  const todayIdx = 7;
  const depth = sd[todayIdx] ?? sd.filter((v) => v !== null).at(-1) ?? 0;

  // Ingen snø nå og ingen i prognosen → skjul sliden (vises igjen når snøen kommer)
  if (depth < 1 && !sd.slice(todayIdx).some((v) => (v ?? 0) >= 1)) {
    return { notConfigured: true, hint: `Ingen snø ved ${s.place} akkurat nå` };
  }

  const days: SkiDay[] = sd.map((v, i) => ({
    date: ymd(new Date(+start + i * 86400_000)),
    snowDepth: v,
    forecast: i > todayIdx,
  }));

  const [weather, webcam] = await Promise.all([
    getWeather({ type: "weather", seconds: 0, place: s.place, lat: s.lat, lon: s.lon, altitude: s.altitude }).catch(() => undefined),
    s.webcam
      ? // Samme forespørsel som /api/webcam bruker, så svaret deles i cachen
        fetch(s.webcam.url, { next: { revalidate: 300 } })
          .then((r) => r.headers.get("last-modified") ?? r.headers.get("date"))
          .catch(() => null)
          .then((lm) => ({
            src: `/api/webcam?screen=${origin.screen}&i=${origin.i}&t=${lm ? Date.parse(lm) : Date.now()}`,
            label: s.webcam!.label,
            credit: s.webcam!.credit,
            takenAt: lm ? new Date(lm).toISOString() : undefined,
          }))
      : Promise.resolve(undefined),
  ]);

  return {
    place: s.place,
    altitude: s.altitude,
    snowDepth: depth,
    snowDepthWeekAgo: sd[0],
    newSnow3d: fsw3d[todayIdx] ?? 0,
    condition: describe(lwc[todayIdx], depth),
    days,
    weather,
    webcam,
  };
}
