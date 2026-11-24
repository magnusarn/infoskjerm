import type { DeparturesSlide } from "../types";

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
export type DeparturesData = { stopName: string; departures: Departure[] };

const QUERY = `query($id: String!, $n: Int!) {
  stopPlace(id: $id) {
    name
    estimatedCalls(numberOfDepartures: $n, timeRange: 10800) {
      realtime
      cancellation
      aimedDepartureTime
      expectedDepartureTime
      destinationDisplay { frontText }
      quay { publicCode }
      serviceJourney { line { publicCode transportMode } }
    }
  }
}`;

export async function getDepartures(s: DeparturesSlide): Promise<DeparturesData> {
  const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "ET-Client-Name": CLIENT },
    body: JSON.stringify({ query: QUERY, variables: { id: s.stopId, n: s.max ?? 10 } }),
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`);
  const json = await res.json();
  const sp = json.data?.stopPlace;
  if (!sp) throw new Error(`Fant ikke holdeplass ${s.stopId}`);
  return {
    stopName: s.stopName || sp.name,
    departures: sp.estimatedCalls.map((c: any) => ({
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
