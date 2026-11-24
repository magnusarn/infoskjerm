import type { CalEvent } from "@/lib/sources/calendar";
import { dayKey, hhmm, TZ } from "../format";

export default function CalendarView({ d, title }: { d: { events: CalEvent[] }; title: string }) {
  const today = dayKey(new Date());
  const tomorrow = dayKey(new Date(Date.now() + 86400_000));
  const groups = new Map<string, CalEvent[]>();
  for (const e of d.events) {
    // Heldagshendelser: legg på 6 timer så de alltid lander på riktig dato uansett tidssone på serveren
    const k = dayKey(new Date(new Date(e.start).getTime() + (e.allDay ? 6 * 3600_000 : 0)));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  const label = (k: string) =>
    k === today
      ? "I dag"
      : k === tomorrow
        ? "I morgen"
        : new Date(k + "T12:00:00").toLocaleDateString("nb-NO", { timeZone: TZ, weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="calendar">
      <h1 className="title">{title}</h1>
      {d.events.length === 0 ? (
        <div className="status">Ingen avtaler</div>
      ) : (
        <div className="cal-grid">
          {[...groups.entries()].slice(0, 6).map(([k, list]) => (
            <section className={k === today ? "cal-day card today" : "cal-day card"} key={k}>
              <div className="label">{label(k)}</div>
              {list.slice(0, 4).map((e, i) => (
                <div className="cal-ev" key={i}>
                  <span className="t">{e.allDay ? "Hele dagen" : `${hhmm(e.start)}–${hhmm(e.end)}`}</span>
                  <span className="n">{e.title}</span>
                </div>
              ))}
              {list.length > 4 && <div className="more">+ {list.length - 4} til</div>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
