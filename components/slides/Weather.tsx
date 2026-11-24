import type { WeatherData } from "@/lib/sources/weather";
import { hhmm, nf, weatherSymbol, weekday } from "../format";

export default function WeatherView({ d }: { d: WeatherData }) {
  const now = weatherSymbol(d.now.symbol);
  return (
    <div className="weather">
      <section className="w-now card">
        <div className="label">Været nå · {d.place}</div>
        <div className="w-now-main">
          <span className="w-icon">{now.icon}</span>
          <span className={d.now.temp < 0 ? "w-temp cold" : "w-temp warm"}>{nf(d.now.temp)}°</span>
        </div>
        <div className="w-desc">{now.text}</div>
        <div className="w-sub">
          Vind {nf(d.now.wind)} m/s{d.now.precip > 0 && <> · Nedbør {nf(d.now.precip, 1)} mm</>}
        </div>
      </section>

      <section className="w-hours card">
        <div className="label">De neste timene</div>
        <div className="w-hour-row">
          {d.hours.map((h) => (
            <div className="w-hour" key={h.time}>
              <div className="t">{hhmm(h.time)}</div>
              <div className="i">{weatherSymbol(h.symbol).icon}</div>
              <div className={h.temp < 0 ? "v cold" : "v warm"}>{nf(h.temp)}°</div>
              <div className="p">{h.precip > 0 ? `${nf(h.precip, 1)} mm` : " "}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-days card">
        {d.days.map((day) => (
          <div className="w-day" key={day.date}>
            <div className="n">{weekday(day.date)}</div>
            <div className="i">{weatherSymbol(day.symbol).icon}</div>
            <div className="mm">
              <span className={day.max < 0 ? "cold" : "warm"}>{nf(day.max)}°</span>
              <span className="min">/ {nf(day.min)}°</span>
            </div>
            <div className="p">{day.precip > 0 ? `${nf(day.precip, 1)} mm` : "Opphold"}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
