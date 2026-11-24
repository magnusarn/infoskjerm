"use client";

import { useEffect, useState } from "react";
import type { DeparturesData } from "@/lib/sources/departures";
import { hhmm, MODE_ICON } from "../format";

export default function DeparturesView({ d }: { d: DeparturesData }) {
  // Re-render hvert 15. sek så «om X min» holder seg riktig mellom datahentinger
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const list = d.departures.filter((x) => new Date(x.expected).getTime() > now - 30_000).slice(0, 8);

  return (
    <div className="departures">
      <h1 className="title">Avganger fra {d.stopName}</h1>
      <div className="dep-list card">
        {list.length === 0 && <div className="status">Ingen avganger de neste timene</div>}
        {list.map((x, i) => {
          const min = Math.round((new Date(x.expected).getTime() - now) / 60_000);
          const late = Math.round((new Date(x.expected).getTime() - new Date(x.aimed).getTime()) / 60_000);
          const when = min <= 0 ? "Nå" : min < 15 ? `${min} min` : hhmm(x.expected);
          return (
            <div className={x.cancelled ? "dep cancelled" : "dep"} key={i}>
              <span className={`line mode-${x.mode}`}>
                <span className="mi">{MODE_ICON[x.mode] ?? "🚌"}</span>
                {x.line}
              </span>
              <span className="dest">{x.destination}</span>
              <span className="plat">{x.platform ? `${x.mode === "rail" ? "Spor" : "Plattform"} ${x.platform}` : ""}</span>
              <span className="when">
                {x.cancelled ? "Innstilt" : when}
                {!x.cancelled && late >= 2 && <small className="late">+{late} min</small>}
                {!x.realtime && !x.cancelled && <small className="sched">rutetid</small>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
