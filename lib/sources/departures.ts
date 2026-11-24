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
export type BoardData = { title: string; stopName: string; departures: Departure[] };
export type DeparturesData = { title?: string; boards: BoardData[] };

function query(board: Board) {
  const modes = board.modes?.length ? `, whiteListedModes: [${board.modes.join(", ")}]` : "";
  // Med retningsfilter henter vi flere avganger, og hele stoppmønsteret, så vi kan sile etterpå
  const n = board.towards?.length ? 40 : (board.max ?? 8) + 4;
  const pattern = board.towards?.length ? "quays { name }" : "";
  return `{
    stopPlace(id: "${board.stopId}") {
      name
      estimatedCalls(numberOfDepartures: ${n}, timeRange: 14400${modes}) {
        realtime
        cancellation
        aimedDepartureTime
        expectedDepartureTime
        stopPositionInPattern
        destinationDisplay { frontText }
        quay { publicCode }
        serviceJourney { line { publicCode transportMode } ${pattern} }
      }
    }
  }`;
}

async function getBoard(board: Board): Promise<BoardData> {
  const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "ET-Client-Name": CLIENT },
    body: JSON.stringify({ query: query(board) }),
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Entur: ${json.errors[0].message}`);
  const sp = json.data?.stopPlace;
  if (!sp) throw new Error(`Fant ikke holdeplass ${board.stopId}`);

  const towards = board.towards?.map((t) => t.toLowerCase());
  const calls = (sp.estimatedCalls as any[]).filter((c) => {
    if (!towards) return true;
    const later: { name: string }[] = (c.serviceJourney?.quays ?? []).slice(c.stopPositionInPattern + 1);
    return later.some((q) => towards.some((t) => q.name?.toLowerCase().includes(t)));
  });

  return {
    title: board.title,
    stopName: sp.name,
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

export async function getDepartures(s: DeparturesSlide): Promise<DeparturesData> {
  return { title: s.title, boards: await Promise.all(s.boards.map(getBoard)) };
}
