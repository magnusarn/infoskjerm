import type { MarketsData, Metal, Fx, KroneIndex } from "@/lib/sources/markets";
import { hhmm, nf } from "../format";

function Change({ label, value, neutral = false }: { label: string; value: number | null; neutral?: boolean }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <div className="mk-change">
      <span className="mk-change-label">{label}</span>
      <span className={neutral ? "mk-delta neutral" : up ? "mk-delta up" : "mk-delta down"}>
        {up ? "▲" : "▼"} {nf(Math.abs(value), 2)} %
      </span>
    </div>
  );
}

/** Kronens utvikling: grønn/blågrønn når kronen styrker seg */
function Krone({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const stronger = value >= 0;
  return (
    <div className="mk-krone-line">
      <span className="mk-change-label">{label}</span>
      <span className={stronger ? "mk-delta up" : "mk-delta down"}>
        {stronger ? "▲ sterkere" : "▼ svakere"} {nf(Math.abs(value), 2)} %
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
      <div className="mk-price-row">
        <div className="mk-price">
          {nf(m.price, digits)} <span className="mk-unit">kr/{m.unit}</span>
        </div>
        {m.usd && (
          <div className="mk-usd">
            <div className="mk-usd-price">
              ${nf(m.usd.price, 2)} <span className="mk-unit">/oz</span>
            </div>
            {m.usd.changeToday !== null && (
              <span className={m.usd.changeToday >= 0 ? "mk-delta up" : "mk-delta down"}>
                {m.usd.changeToday >= 0 ? "▲" : "▼"} {nf(Math.abs(m.usd.changeToday), 2)} % i dag
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mk-changes">
        <Change label="I dag" value={m.changeToday} />
        <Change label="Siste 7 dager" value={m.changeWeek} />
      </div>
      <Sparkline points={[...m.history.map((h) => h.price), m.price]} />
      <div className="mk-spark-label">
        <span>Siste 30 dager</span>
        <span>Spotpris hentet kl. {hhmm(m.fetchedAt)}</span>
      </div>
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
        <Change label="Dag" value={f.changeDay} neutral />
        <Change label="Uke" value={f.changeWeek} neutral />
      </div>
      <div className="mk-krone">
        <Krone label="Kronen" value={f.kroneDay} />
      </div>
    </section>
  );
}

function KroneCard({ k }: { k: KroneIndex }) {
  return (
    <section className="mk-fx mk-krone-card card">
      <div className="label">Kronekurs (I-44)</div>
      <div className="mk-krone-big">
        <Krone label="I dag" value={k.kroneDay} />
        <Krone label="Siste uke" value={k.kroneWeek} />
      </div>
      <div className="mk-fx-note">
        Norges Bank · gjelder{" "}
        {new Date(k.date + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long" })} · hentet kl.{" "}
        {hhmm(k.fetchedAt)}
      </div>
    </section>
  );
}

export default function MarketsView({ d, title }: { d: MarketsData; title: string }) {
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
          {d.krone && <KroneCard k={d.krone} />}
        </div>
      )}
    </div>
  );
}
