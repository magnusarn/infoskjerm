import type { MarketsData, Metal, Fx } from "@/lib/sources/markets";
import { nf } from "../format";

function Change({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <div className="mk-change">
      <span className="mk-change-label">{label}</span>
      <span className={up ? "mk-delta up" : "mk-delta down"}>
        {up ? "▲" : "▼"} {nf(Math.abs(value), 2)} %
      </span>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 600;
  const h = 150;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - 8 - ((p - min) / span) * (h - 16)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg className="mk-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="mkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bd9a5f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#bd9a5f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mkfill)" />
      <path d={line} fill="none" stroke="#bd9a5f" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MetalCard({ m }: { m: Metal }) {
  const digits = m.unit === "kg" ? 0 : 2;
  return (
    <section className="mk-metal card">
      <div className="label">{m.name}</div>
      <div className="mk-price">
        {nf(m.price, digits)} <span className="mk-unit">kr/{m.unit}</span>
      </div>
      <div className="mk-changes">
        <Change label="I dag" value={m.changeToday} />
        <Change label="Siste 7 dager" value={m.changeWeek} />
      </div>
      <Sparkline points={[...m.history.map((h) => h.price), m.price]} />
      <div className="mk-spark-label">Siste 30 dager</div>
    </section>
  );
}

function FxCard({ f }: { f: Fx }) {
  return (
    <section className="mk-fx card">
      <div className="label">{f.label}</div>
      <div className="mk-fx-rate">
        {nf(f.rate, f.code === "SEK" ? 2 : 4)} <span className="mk-unit">kr</span>
      </div>
      <div className="mk-changes">
        <Change label="Dag" value={f.changeDay} />
        <Change label="Uke" value={f.changeWeek} />
      </div>
    </section>
  );
}

export default function MarketsView({ d, title }: { d: MarketsData; title: string }) {
  const fxDate = d.fx[0]?.date;
  return (
    <div className="markets">
      <h1 className="title">{title}</h1>
      <div className="mk-metals">
        {d.metals.map((m) => (
          <MetalCard key={m.code} m={m} />
        ))}
      </div>
      {d.fx.length > 0 && (
        <div className="mk-fx-row">
          {d.fx.map((f) => (
            <FxCard key={f.code} f={f} />
          ))}
          {fxDate && (
            <div className="mk-fx-note">
              Valutakurser fra Norges Bank
              <br />
              {new Date(fxDate + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
