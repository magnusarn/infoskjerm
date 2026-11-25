/**
 * Vei og trafikk
 * - Reisetid med sanntidstrafikk: TomTom Routing API (gratis nøkkel, 2 500 kall/døgn)
 *     TOMTOM_API_KEY
 * - Trafikkmeldinger: Statens vegvesen DATEX II (gratis, men krever bestilt brukernavn/passord)
 *     VEGVESEN_DATEX_USER, VEGVESEN_DATEX_PASSWORD
 * Statens vegvesen skal alltid oppgis som kilde for trafikkmeldingene.
 */
import { XMLParser } from "fast-xml-parser";
import type { TrafficSlide } from "../types";

export type Trip = { name: string; minutes: number; normalMinutes: number; delayMinutes: number; km: number };
export type TrafficMessage = { road: string; type: string; text: string; updated?: string };
export type TrafficData =
  | { trips: Trip[]; messages: TrafficMessage[] | null; failed?: string[] }
  | { notConfigured: true; hint: string };

async function getTrips(s: TrafficSlide, key: string): Promise<Trip[]> {
  return Promise.all(
    s.destinations.map(async (d) => {
      const url =
        `https://api.tomtom.com/routing/1/calculateRoute/${s.from.lat},${s.from.lon}:${d.lat},${d.lon}/json` +
        `?key=${key}&traffic=true&travelMode=car&routeType=fastest&computeTravelTimeFor=all`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) throw new Error(`TomTom svarte ${res.status}`);
      const sum = (await res.json()).routes?.[0]?.summary;
      if (!sum) throw new Error(`Fant ingen rute til ${d.name}`);
      const min = (sec: number) => Math.round(sec / 60);
      return {
        name: d.name,
        minutes: min(sum.travelTimeInSeconds),
        // «Normalt» = vanlig reisetid på dette tidspunktet (historisk trafikk), ikke tom vei
        normalMinutes: min(
          sum.historicTrafficTravelTimeInSeconds ?? sum.noTrafficTravelTimeInSeconds ?? sum.travelTimeInSeconds - (sum.trafficDelayInSeconds ?? 0)
        ),
        delayMinutes: min(sum.trafficDelayInSeconds ?? 0),
        km: Math.round(sum.lengthInMeters / 100) / 10,
      };
    })
  );
}

const TYPE_NB: Record<string, string> = {
  Accident: "Ulykke",
  AbnormalTraffic: "Kø",
  Roadworks: "Vegarbeid",
  MaintenanceWorks: "Vegarbeid",
  ConstructionWorks: "Anleggsarbeid",
  RoadOrCarriagewayOrLaneManagement: "Stengt felt/veg",
  VehicleObstruction: "Hindring",
  GeneralObstruction: "Hindring",
  AnimalPresenceObstruction: "Dyr i vegen",
  PoorEnvironmentConditions: "Vanskelige forhold",
  NonWeatherRelatedRoadConditions: "Føreforhold",
  WeatherRelatedRoadConditions: "Føreforhold",
  ReroutingManagement: "Omkjøring",
  SpeedManagement: "Fartsregulering",
  DisturbanceActivity: "Hendelse",
  PublicEvent: "Arrangement",
  EquipmentOrSystemFault: "Teknisk feil",
  GeneralNetworkManagement: "Trafikkregulering",
};

/** Går gjennom et vilkårlig XML-tre og samler verdier for bestemte nøkler */
function collect(node: any, keys: string[], out: Record<string, any[]> = {}): Record<string, any[]> {
  if (node === null || typeof node !== "object") return out;
  for (const [k, v] of Object.entries(node)) {
    if (keys.includes(k)) (out[k] ??= []).push(v);
    if (typeof v === "object") collect(v, keys, out);
  }
  return out;
}
const text = (v: any): string => (typeof v === "string" || typeof v === "number" ? String(v) : v?.["#text"] ?? "");

async function getMessages(s: TrafficSlide, user: string, pass: string): Promise<TrafficMessage[]> {
  const res = await fetch("https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetSituation/pullsnapshotdata", {
    headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
    cache: "no-store", // hele landet – for stort for cachen; klientene spør bare hvert 5. minutt
  });
  if (!res.ok) throw new Error(`Vegvesen svarte ${res.status}`);
  const xml = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, attributeNamePrefix: "@" }).parse(await res.text());
  const situations = collect(xml, ["situation"]).situation?.flat() ?? [];
  const [minLat, minLon, maxLat, maxLon] = s.bbox;
  const patterns = s.roads.map((r) => ({ label: r.label, re: new RegExp(r.match, "i") }));

  const out: (TrafficMessage & { sort: number })[] = [];
  for (const sit of situations) {
    const records = [sit.situationRecord ?? []].flat();
    for (const rec of records) {
      const c = collect(rec, ["latitude", "longitude", "roadNumber", "roadName", "comment", "value", "situationRecordVersionTime"]);
      const lats = (c.latitude ?? []).map((v) => Number(text(v)));
      const lons = (c.longitude ?? []).map((v) => Number(text(v)));
      const inside = lats.some((la, i) => la >= minLat && la <= maxLat && lons[i] >= minLon && lons[i] <= maxLon);
      if (!inside) continue;

      // Norsk kommentartekst
      const comments = collect(c.comment ?? [], ["value"]).value?.flat() ?? [];
      const no = comments.find((v: any) => ["no", "nb", "nob"].includes(String(v?.["@lang"] ?? "").toLowerCase())) ?? comments[0];
      const msg = text(no).replace(/\s+/g, " ").trim();
      if (!msg) continue;

      const roadText = [...(c.roadNumber ?? []), ...(c.roadName ?? [])].map(text).join(" ") + " " + msg;
      const road = patterns.find((p) => p.re.test(roadText));
      if (!road) continue;

      const type = String(rec["@type"] ?? "").replace(/^.*:/, "");
      const updated = text(c.situationRecordVersionTime?.[0]);
      out.push({ road: road.label, type: TYPE_NB[type] ?? "Melding", text: msg, updated, sort: Date.parse(updated) || 0 });
    }
  }
  // Nyeste først, uten duplikater
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.sort - a.sort)
    .filter((m) => !seen.has(m.text) && seen.add(m.text))
    .slice(0, 4)
    .map(({ sort, ...m }) => m);
}

export async function getTraffic(s: TrafficSlide): Promise<TrafficData> {
  const key = process.env.TOMTOM_API_KEY;
  const user = process.env.VEGVESEN_DATEX_USER;
  const pass = process.env.VEGVESEN_DATEX_PASSWORD;
  if (!key) return { notConfigured: true, hint: "Legg inn TOMTOM_API_KEY (og gjerne VEGVESEN_DATEX_USER/PASSWORD) i Vercel" };

  const [trips, messages] = await Promise.allSettled([
    getTrips(s, key),
    user && pass ? getMessages(s, user, pass) : Promise.resolve(null),
  ]);
  if (trips.status === "rejected") throw trips.reason;
  return {
    trips: trips.value,
    messages: messages.status === "fulfilled" ? messages.value : [],
    failed: messages.status === "rejected" ? [`Trafikkmeldinger: ${messages.reason?.message}`] : undefined,
  };
}
