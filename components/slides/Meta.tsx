import { KpiCard, BarList } from "./Kpi";
import { compact, nf } from "../format";

type Row = { spend: number; impressions: number; reach: number; clicks: number; ctr: number; cpc: number };
type D = { currency: string; cur: Row; prev: Row; campaigns: { name: string; spend: number; impressions: number; clicks: number }[] };

export default function MetaView({ d, title }: { d: D; title: string }) {
  const money = (n: number) => `${nf(n)} ${d.currency === "NOK" ? "kr" : d.currency}`;
  const money2 = (n: number) => `${nf(n, 2)} ${d.currency === "NOK" ? "kr" : d.currency}`;
  return (
    <div className="dash">
      <h1 className="title">{title}</h1>
      <div className="kpi-row five">
        <KpiCard label="Forbruk" value={d.cur.spend} previous={d.prev.spend} format={money} />
        <KpiCard label="Visninger" value={d.cur.impressions} previous={d.prev.impressions} format={compact} />
        <KpiCard label="Rekkevidde" value={d.cur.reach} previous={d.prev.reach} format={compact} />
        <KpiCard label="Klikk" value={d.cur.clicks} previous={d.prev.clicks} format={compact} />
        <KpiCard label="Kostnad per klikk" value={d.cur.cpc} previous={d.prev.cpc} format={money2} invert />
      </div>
      <div className="dash-row two">
        <section className="card">
          <div className="label">Forbruk per kampanje</div>
          <BarList rows={d.campaigns.map((c) => ({ name: c.name, value: c.spend }))} format={money} />
        </section>
        <section className="card">
          <div className="label">Klikk per kampanje</div>
          <BarList rows={d.campaigns.map((c) => ({ name: c.name, value: c.clicks }))} format={(n) => nf(n)} />
        </section>
      </div>
    </div>
  );
}
