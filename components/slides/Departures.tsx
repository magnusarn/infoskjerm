"use client";

import { useEffect, useState } from "react";
import type { BoardData, DeparturesData } from "@/lib/sources/departures";
import { hhmm, MODE_ICON } from "../format";

export default function DeparturesView({ d }: { d: DeparturesData }) {
  // Re-render hvert 15. sek så «X min» holder seg riktig mellom datahentinger
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const many = d.boards.length > 1;
  return (
    <div className="departures">
      <h1 className="title">{d.title ?? (many ? "Avganger" : `Avganger fra ${d.boards[0]?.stopName}`)}</h1>
      <div className={many ? "boards" : ""} style={{ gridTemplateColumns: `repeat(${d.boards.length}, minmax(0, 1fr))` }}>
        {d.boards.map((b, i) => (
          <BoardView key={i} b={b} compact={many} />
        ))}
      </div>
    </div>
  );
}

function BoardView({ b, compact }: { b: BoardData; compact: boolean }) {
  const now = Date.now();
  const list = b.departures.filter((x) => new Date(x.expected).getTime() > now - 30_000);
  return (
    <section className={compact ? "board card compact" : "board card"}>
      {compact && (
        <header className="board-head">
          <div>
            <div className="board-title">{b.title}</div>
            <div className="board-stop">fra {b.stopName}</div>
          </div>
          {b.walkMinutes !== undefined && (
            <div className="walk" title="Gangtid fra kontoret">
              <span className="walk-icon">🚶</span>
              <span className="walk-min">{b.walkMinutes}</span>
              <span className="walk-unit">min</span>
            </div>
          )}
        </header>
      )}
      {list.length === 0 && <div className="board-empty">Ingen avganger de neste timene</div>}
      {list.map((x, i) => {
        const min = Math.round((new Date(x.expected).getTime() - now) / 60_000);
        const late = Math.round((new Date(x.expected).getTime() - new Date(x.aimed).getTime()) / 60_000);
        const when = min <= 0 ? "Nå" : min < 15 ? `${min} min` : hhmm(x.expected);
        return (
          <div
            className={[
              "dep",
              x.cancelled && "cancelled",
              b.walkMinutes !== undefined && min < b.walkMinutes && "unreachable",
            ]
              .filter(Boolean)
              .join(" ")}
            key={i}
          >
            <span className={`line mode-${x.mode}`}>
              {!compact && <span className="mi">{MODE_ICON[x.mode] ?? "🚌"}</span>}
              {x.line}
            </span>
            <span className="dest">{x.destination}</span>
            {!compact && (
              <span className="plat">{x.platform ? `${x.mode === "rail" ? "Spor" : "Plattform"} ${x.platform}` : ""}</span>
            )}
            <span className="when">
              {x.cancelled ? "Innstilt" : when}
              {!x.cancelled && late >= 2 && <small className="late">+{late} min</small>}
              {!x.realtime && !x.cancelled && <small className="sched">rutetid</small>}
            </span>
          </div>
        );
      })}
      {/* Plass til én melding per tavle – flere vises som et antall */}
      {b.notices?.length > 0 && (
        <div className="notice">
          <span className="notice-icon">!</span>
          <span>
            {b.notices[0]}
            {b.notices.length > 1 && (
              <em className="notice-more">
                {" "}
                · +{b.notices.length - 1} melding{b.notices.length > 2 ? "er" : ""} til
              </em>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
