import type { Board, DeparturesSlide } from "../types";

// Entur krever ET-Client-Name på formen "<firma>-<app>"
const CLIENT = process.env.ENTUR_CLIENT_NAME || "privat-infoskjerm";

export type Departure = {
  line: string;
  mode: string;
  destination: string;
  aimed: string;
  expected: string;
  realtime: boolean;
  cancelled: boolean;
  platform?: string;
};
export type TripOption = {
  start: string;
  aimedStart: string;
  end: string;
  minutes: number;
  lines: string[];
  changes: number;
  via?: string;
  platform?: string;
  realtime: boolean;
};
export type BoardData = {
  title: string;
  stopName: string;
  departures: Departure[];
  notices: string[];
  walkMinutes?: number;
  /** Antall avganger man rekker som skal vises (de man ikke rekker kommer i tillegg, i halv størrelse) */
  max?: number;
  trips?: TripOption[];
  toName?: string;
};
export type DeparturesData = { title?: string; boards: BoardData[]; columns?: number[][] };

function query(board: Board, stopId: string) {
  const modes = board.modes?.length ? `, whiteListedModes: [${board.modes.join(", ")}]` : "";
  // Med retningsfilter henter vi flere avganger, og hele stoppmønsteret, så vi kan sile etterpå
  const n = board.towards?.length ? 40 : (board.max ?? 8) + 4;
  const pattern = board.towards?.length ? "quays { name }" : "";
  return `{
    stopPlace(id: "${stopId}") {
      name
      latitude
      longitude
      situations { id summary { value language } description { value language } }
      estimatedCalls(numberOfDepartures: ${n}, timeRange: 14400${modes}) {
        realtime
        cancellation
        aimedDepartureTime
        expectedDepartureTime
        stopPositionInPattern
        destinationDisplay { frontText }
        quay { publicCode }
        situations { id summary { value language } description { value language } }
        serviceJourney { line { publicCode transportMode } ${pattern} }
      }
    }
  }`;
}

/** Reiseboks: de neste reisene fra board.stopId til board.trip.toStopId (med bytter) */
async function getTripBoard(board: Board, walkFrom?: { lat: number; lon: number }): Promise<BoardData> {
  const t = board.trip!;
  const modes = board.modes?.length ? board.modes.map((m) => `{ transportMode: ${m} }`).join(", ") : "";
  const query = `{
    stopPlace(id: "${board.stopId}") { name latitude longitude }
    trip(from: { place: "${board.stopId}" }, to: { place: "${t.toStopId}" }, numTripPatterns: ${(t.count ?? 2) + 2},
         searchWindow: 300, modes: { accessMode: foot, egressMode: foot${modes ? `, transportModes: [${modes}]` : ""} }) {
      tripPatterns {
        expectedStartTime aimedStartTime expectedEndTime duration
        legs { mode realtime line { publicCode } fromPlace { name quay { publicCode } } toPlace { name } }
      }
    }
  }`;
  const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "ET-Client-Name": CLIENT },
    body: JSON.stringify({ query }),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Entur: ${json.errors[0].message}`);
  const sp = json.data?.stopPlace;
  const now = Date.now();
  const trips: TripOption[] = (json.data?.trip?.tripPatterns ?? [])
    .map((p: any) => {
      const ride = p.legs.filter((l: any) => l.mode !== "foot");
      return {
        start: ride[0]?.expectedStartTime ?? p.expectedStartTime,
        aimedStart: p.aimedStartTime,
        end: p.expectedEndTime,
        minutes: Math.round(p.duration / 60),
        lines: ride.map((l: any) => l.line?.publicCode).filter(Boolean),
        changes: Math.max(0, ride.length - 1),
        via: ride.length > 1 ? ride[0].toPlace?.name : undefined,
        platform: ride[0]?.fromPlace?.quay?.publicCode || undefined,
        realtime: ride.every((l: any) => l.realtime),
      };
    })
    .filter((x: TripOption) => new Date(x.start).getTime() > now - 30_000)
    .slice(0, t.count ?? 2);

  const data: BoardData = { title: board.title, stopName: sp?.name ?? "", departures: [], notices: [], trips, toName: t.toName };
  if (walkFrom && board.walk !== false && sp?.latitude) {
    data.walkMinutes = await walkMinutes(walkFrom, board.stopId, { lat: sp.latitude, lon: sp.longitude });
  }
  return data;
}

async function getBoard(board: Board, walkFrom?: { lat: number; lon: number }): Promise<BoardData> {
  if (board.trip) return getTripBoard(board, walkFrom);
  const ids = [board.stopId, ...(board.fallbackStopIds ?? [])];
  let result: (BoardData & { _coords?: { lat: number; lon: number }; _id?: string }) | undefined;
  for (const id of ids) {
    result = await getBoardAt(board, id);
    if (result.departures.length) break;
  }
  const { _coords, _id, ...data } = result!;
  if (walkFrom && board.walk !== false && _coords && _id) data.walkMinutes = await walkMinutes(walkFrom, _id, _coords);
  return data;
}

/** Gangtid fra kontoret til holdeplassen: Enturs reiseplanlegger (til fots), ellers luftlinje × 1,3 i 4,8 km/t */
async function walkMinutes(from: { lat: number; lon: number }, stopId: string, to: { lat: number; lon: number }) {
  try {
    const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ET-Client-Name": CLIENT },
      body: JSON.stringify({
        query: `{ trip(from: { coordinates: { latitude: ${from.lat}, longitude: ${from.lon} } }, to: { place: "${stopId}" },
                   modes: { directMode: foot, transportModes: [] }, numTripPatterns: 1) { tripPatterns { duration } } }`,
      }),
      next: { revalidate: 86400 }, // gangtid endrer seg ikke – hent én gang i døgnet
    });
    const sec = (await res.json())?.data?.trip?.tripPatterns?.[0]?.duration;
    if (typeof sec === "number" && sec > 0) return Math.max(1, Math.round(sec / 60));
  } catch {}
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLon = rad(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLon / 2) ** 2;
  const meters = 2 * R * Math.asin(Math.sqrt(a)) * 1.3;
  return Math.max(1, Math.round(meters / 80));
}

async function getBoardAt(board: Board, stopId: string): Promise<BoardData & { _coords?: { lat: number; lon: number }; _id?: string }> {
  const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "ET-Client-Name": CLIENT },
    body: JSON.stringify({ query: query(board, stopId) }),
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Entur: ${json.errors[0].message}`);
  const sp = json.data?.stopPlace;
  if (!sp) throw new Error(`Fant ikke holdeplass ${stopId}`);

  const towards = board.towards?.map((t) => t.toLowerCase());
  const calls = (sp.estimatedCalls as any[]).filter((c) => {
    if (!towards) return true;
    const later: { name: string }[] = (c.serviceJourney?.quays ?? []).slice(c.stopPositionInPattern + 1);
    return later.some((q) => towards.some((t) => q.name?.toLowerCase().includes(t)));
  });

  // Avvik: meldinger på holdeplassen + på avgangene som faktisk vises (etter filter)
  const shown = calls.slice(0, (board.max ?? 8) + 4);
  const seen = new Set<string>();
  const notices: string[] = [];
  for (const sit of [...(sp.situations ?? []), ...shown.flatMap((c: any) => c.situations ?? [])]) {
    if (!sit || seen.has(sit.id)) continue;
    seen.add(sit.id);
    const text = pickLang(sit.summary) || pickLang(sit.description);
    if (text && !notices.includes(text)) notices.push(text);
  }

  return {
    _coords: sp.latitude ? { lat: sp.latitude, lon: sp.longitude } : undefined,
    _id: stopId,
    title: board.title,
    stopName: sp.name,
    notices: notices.slice(0, 2),
    max: board.max ?? 8,
    // Hent noen ekstra – de man ikke rekker vises i tillegg, i halv størrelse
    departures: calls.slice(0, (board.max ?? 8) + 4).map((c) => ({
      line: c.serviceJourney?.line?.publicCode ?? "",
      mode: c.serviceJourney?.line?.transportMode ?? "bus",
      destination: c.destinationDisplay?.frontText ?? "",
      aimed: c.aimedDepartureTime,
      expected: c.expectedDepartureTime,
      realtime: c.realtime,
      cancelled: c.cancellation,
      platform: c.quay?.publicCode || undefined,
    })),
  };
}

function pickLang(list?: { value: string; language?: string }[]) {
  if (!list?.length) return "";
  const no = list.find((l) => ["no", "nob", "nb", "nn", "nno"].includes((l.language ?? "").toLowerCase()));
  return (no ?? list[0]).value?.trim() ?? "";
}

export async function getDepartures(s: DeparturesSlide): Promise<DeparturesData> {
  return { title: s.title, columns: s.columns, boards: await Promise.all(s.boards.map((b) => getBoard(b, s.walkFrom))) };
}
