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
  // Standard: én kolonne per tavle. Med «columns» kan flere tavler stables i samme kolonne.
  const columns = d.columns ?? d.boards.map((_, i) => [i]);
  const weights = columns.map((col) => (col.length === 1 && (d.boards[col[0]]?.departures.length ?? 0) > 6 ? 1.15 : 1));
  return (
    <div className="departures">
      <h1 className="title">{d.title ?? (many ? "Avganger" : `Avganger fra ${d.boards[0]?.stopName}`)}</h1>
      <div
        className={many ? "boards" : "boards single"}
        style={{ gridTemplateColumns: weights.map((w) => `minmax(0, ${w}fr)`).join(" ") }}
      >
        {columns.map((col, c) => (
          <div className={col.length > 1 ? "board-col stacked" : "board-col"} key={c}>
            {col.map((i) =>
              d.boards[i] ? (
                d.boards[i].trips ? (
                  <TripView key={i} b={d.boards[i]} />
                ) : (
                  <BoardView key={i} b={d.boards[i]} compact={many} />
                )
              ) : null
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Walk({ minutes }: { minutes?: number }) {
  if (minutes === undefined) return null;
  return (
    <div className="walk" title="Gangtid fra kontoret">
      <span className="walk-icon">🚶</span>
      <span className="walk-min">{minutes}</span>
      <span className="walk-unit">min</span>
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
          <Walk minutes={b.walkMinutes} />
        </header>
      )}
      <div className="dep-rows">
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
      </div>
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

/** Reiseboks, f.eks. «Neste tog til Hamar» */
function TripView({ b }: { b: BoardData }) {
  const now = Date.now();
  const trips = b.trips ?? [];
  return (
    <section className="board card compact trip-board">
      <header className="board-head">
        <div>
          <div className="board-title">{b.title}</div>
          <div className="board-stop">fra {b.stopName}</div>
        </div>
        <Walk minutes={b.walkMinutes} />
      </header>
      {trips.length === 0 && <div className="board-empty">Ingen reiser de neste timene</div>}
      {trips.map((t, i) => {
        const min = Math.round((new Date(t.start).getTime() - now) / 60_000);
        const late = Math.round((new Date(t.start).getTime() - new Date(t.aimedStart).getTime()) / 60_000);
        const h = Math.floor(t.minutes / 60);
        const dur = h ? `${h} t ${t.minutes % 60} min` : `${t.minutes} min`;
        const unreachable = b.walkMinutes !== undefined && min < b.walkMinutes;
        const how = t.changes === 0 ? "direkte" : `${t.changes} bytte${t.via ? ` (${t.via})` : ""}`;
        if (i > 0) {
          // Senere avganger på én kompakt linje
          return (
            <div className={unreachable ? "trip-next unreachable" : "trip-next"} key={i}>
              <span className="trip-next-label">Deretter</span>
              <span className="trip-next-times">
                {hhmm(t.start)} → {hhmm(t.end)}
              </span>
              <span className="trip-next-meta">
                {t.lines.join(" + ")} · {how}
              </span>
            </div>
          );
        }
        return (
          <div className={unreachable ? "trip unreachable" : "trip"} key={i}>
            <div className="trip-times">
              <span className="trip-dep">{hhmm(t.start)}</span>
              <span className="trip-arrow">→</span>
              <span className="trip-arr">{hhmm(t.end)}</span>
              <span className="trip-in">{min <= 0 ? "nå" : min < 60 ? `om ${min} min` : ""}</span>
            </div>
            <div className="trip-meta">
              {t.lines.map((l) => (
                <span className="line mode-rail trip-line" key={l}>
                  {l}
                </span>
              ))}
              <span className="trip-meta-text">
                {t.platform && <>Spor {t.platform} · </>}
                {how} · {dur}
                {late >= 2 && <span className="late"> · +{late} min</span>}
                {!t.realtime && <span className="sched"> · rutetid</span>}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
