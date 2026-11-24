import { change, nf } from "../format";

/** Stort nøkkeltall med endring mot forrige periode. `invert` = lavere er bedre (f.eks. CPC). */
export function KpiCard({
  label,
  value,
  previous,
  format = (n) => nf(n),
  invert = false,
  note,
}: {
  label: string;
  value: number;
  previous: number;
  format?: (n: number) => string;
  invert?: boolean;
  note?: string;
}) {
  const pct = change(value, previous);
  const good = pct === null ? null : invert ? pct < 0 : pct > 0;
  return (
    <div className="kpi card">
      <div className="label">{label}</div>
      <div className="kpi-value">{format(value)}</div>
      {pct !== null && (
        <div className={good ? "kpi-delta up" : "kpi-delta down"}>
          {pct > 0 ? "▲" : "▼"} {nf(Math.abs(pct), 1)} % <span>mot uka før</span>
        </div>
      )}
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}

/** Enkel horisontal stolpeliste */
export function BarList({ rows, format = (n) => nf(n) }: { rows: { name: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="barlist">
      {rows.map((r) => (
        <div className="bar-row" key={r.name}>
          <div className="bar-name">{r.name}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <div className="bar-val">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
