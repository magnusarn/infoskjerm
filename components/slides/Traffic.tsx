import type { TrafficData } from "@/lib/sources/traffic";
import { hhmm, nf } from "../format";

type D = Extract<TrafficData, { trips: unknown }>;

export default function TrafficView({ d, title }: { d: D; title: string }) {
  const hasMessages = d.messages !== null;
  return (
    <div className="traffic">
      <h1 className="title">{title}</h1>
      <div className={hasMessages ? "tr-grid" : "tr-grid only-trips"}>
        <section className={d.trips.length > 4 ? "tr-trips many" : "tr-trips"}>
          {d.trips.map((t) => {
            const level = t.delayMinutes >= 10 ? "heavy" : t.delayMinutes >= 4 ? "some" : "ok";
            return (
              <div className={`tr-trip card ${level}`} key={t.name}>
                <div className="label">Til {t.name}</div>
                <div className="tr-time">
                  {t.minutes >= 60 ? (
                    <>
                      {Math.floor(t.minutes / 60)} <span className="mk-unit">t</span> {t.minutes % 60}{" "}
                      <span className="mk-unit">min</span>
                    </>
                  ) : (
                    <>
                      {t.minutes} <span className="mk-unit">min</span>
                    </>
                  )}
                </div>
                <div className="tr-sub">
                  {t.delayMinutes >= 1 ? (
                    <span className={`tr-delay ${level}`}>+{t.delayMinutes} min kø</span>
                  ) : (
                    <span className="tr-delay ok">Fri flyt</span>
                  )}
                  <span>
                    Normalt {t.normalMinutes} min · {nf(t.km, 1)} km
                  </span>
                </div>
              </div>
            );
          })}
        </section>
        {hasMessages && (
          <section className="tr-msgs card">
            <div className="label">Trafikkmeldinger · Ring 3, E18 og E6</div>
            {d.messages!.length === 0 && <div className="tr-none">Ingen meldinger akkurat nå 👍</div>}
            {d.messages!.map((m, i) => (
              <div className="tr-msg" key={i}>
                <span className="tr-road">{m.road}</span>
                <div className="tr-msg-body">
                  <div className="tr-msg-type">
                    {m.type}
                    {m.updated && <span> · oppdatert {hhmm(m.updated)}</span>}
                  </div>
                  <div className="tr-msg-text">{m.text}</div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
