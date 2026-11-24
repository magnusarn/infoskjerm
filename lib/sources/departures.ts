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
export type BoardData = { title: string; stopName: string; departures: Departure[]; notices: string[] };
export type DeparturesData = { title?: string; boards: BoardData[] };

function query(board: Board, stopId: string) {
  const modes = board.modes?.length ? `, whiteListedModes: [${board.modes.join(", ")}]` : "";
  // Med retningsfilter henter vi flere avganger, og hele stoppmønsteret, så vi kan sile etterpå
  const n = board.towards?.length ? 40 : (board.max ?? 8) + 4;
  const pattern = board.towards?.length ? "quays { name }" : "";
  return `{
    stopPlace(id: "${stopId}") {
      name
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

async function getBoard(board: Board): Promise<BoardData> {
  const ids = [board.stopId, ...(board.fallbackStopIds ?? [])];
  let result: BoardData | undefined;
  for (const id of ids) {
    result = await getBoardAt(board, id);
    if (result.departures.length) return result;
  }
  return result!;
}

async function getBoardAt(board: Board, stopId: string): Promise<BoardData> {
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
  const shown = calls.slice(0, board.max ?? 8);
  const seen = new Set<string>();
  const notices: string[] = [];
  for (const sit of [...(sp.situations ?? []), ...shown.flatMap((c: any) => c.situations ?? [])]) {
    if (!sit || seen.has(sit.id)) continue;
    seen.add(sit.id);
    const text = pickLang(sit.summary) || pickLang(sit.description);
    if (text && !notices.includes(text)) notices.push(text);
  }

  return {
    title: board.title,
    stopName: sp.name,
    notices: notices.slice(0, 2),
    departures: calls.slice(0, board.max ?? 8).map((c) => ({
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
  return { title: s.title, boards: await Promise.all(s.boards.map(getBoard)) };
}
