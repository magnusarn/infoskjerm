import type { SkiData } from "@/lib/sources/ski";
import { hhmm, nf, weatherSymbol, weekday } from "../format";

type D = Extract<SkiData, { snowDepth: number }>;

export default function SkiView({ d, title }: { d: D; title: string }) {
  const change = d.snowDepthWeekAgo !== null ? d.snowDepth - d.snowDepthWeekAgo : null;
  const ahead = d.days.filter((x) => x.forecast).slice(0, 3);
  const wx = d.weather;
  return (
    <div className="ski">
      <h1 className="title">{title}</h1>
      <div className="ski-grid">
        {d.webcam && (
          <section className="ski-cam card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.webcam.src} alt={d.webcam.label} />
            <div className="ski-cam-caption">
              <span>{d.webcam.label}</span>
              <span>
                {d.webcam.takenAt && <>Bilde tatt kl. {hhmm(d.webcam.takenAt)} · </>}
                {d.webcam.credit}
              </span>
            </div>
          </section>
        )}
        <div className="ski-side">
          <section className="card ski-snow">
            <div className="label">
              Snødybde · {d.place}, {d.altitude} moh.
            </div>
            <div className="ski-depth">
              {nf(d.snowDepth)} <span className="mk-unit">cm</span>
            </div>
            <div className="ski-facts">
              {d.condition && <span>{d.condition}</span>}
              <span>Nysnø 3 døgn: {nf(d.newSnow3d)} cm</span>
              {change !== null && (
                <span>
                  Siste uke: {change >= 0 ? "+" : "−"}
                  {nf(Math.abs(change), 1)} cm
                </span>
              )}
            </div>
          </section>
          {wx && (
            <section className="card ski-wx">
              <div className="label">Været ved {d.place}</div>
              <div className="ski-wx-now">
                <span className="ski-wx-icon">{weatherSymbol(wx.now.symbol).icon}</span>
                <span className={wx.now.temp < 0 ? "ski-wx-temp cold" : "ski-wx-temp warm"}>
                  {nf(wx.now.temp)}
                  <span className="deg">°</span>
                </span>
                <span className="ski-wx-desc">{weatherSymbol(wx.now.symbol).text}</span>
              </div>
              <div className="ski-days">
                {wx.days.slice(0, 3).map((day, i) => (
                  <div className="ski-day" key={day.date}>
                    <div className="n">{weekday(day.date)}</div>
                    <div className="i">{weatherSymbol(day.symbol).icon}</div>
                    <div className="t">
                      <span className={day.max < 0 ? "cold" : "warm"}>{nf(day.max)}°</span>
                      <span className="min"> / {nf(day.min)}°</span>
                    </div>
                    {ahead[i]?.snowDepth != null && <div className="s">❄ {nf(ahead[i].snowDepth!)} cm</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
