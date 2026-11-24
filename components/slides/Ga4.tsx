import { KpiCard, BarList } from "./Kpi";
import { compact, nf, weekday } from "../format";

type D = {
  kpis: Record<"users" | "sessions" | "keyEvents" | "views", { value: number; previous: number }>;
  formLabel?: string;
  formNote?: string;
  daily: { date: string; sessions: number }[];
  topPages: { path: string; views: number }[];
  channels: { name: string; sessions: number }[];
};

const CHANNEL_NB: Record<string, string> = {
  "Organic Search": "Organisk søk",
  "Paid Search": "Betalt søk",
  Direct: "Direkte",
  "Organic Social": "Organisk sosialt",
  "Paid Social": "Betalt sosialt",
  Referral: "Henvisning",
  Email: "E-post",
  Display: "Display",
  "Cross-network": "Kryssnettverk",
  Unassigned: "Ikke tildelt",
};

export default function Ga4View({ d, title }: { d: D; title: string }) {
  const max = Math.max(1, ...d.daily.map((x) => x.sessions));
  return (
    <div className="dash">
      <h1 className="title">{title}</h1>
      <div className="kpi-row">
        <KpiCard label="Brukere" {...d.kpis.users} format={compact} />
        <KpiCard label="Økter" {...d.kpis.sessions} format={compact} />
        <KpiCard label="Sidevisninger" {...d.kpis.views} format={compact} />
        <KpiCard label={d.formLabel ?? "Nøkkelhendelser"} {...d.kpis.keyEvents} note={d.formNote} />
      </div>
      <div className="dash-row">
        <section className="card">
          <div className="label">Økter per dag</div>
          <div className="columns">
            {d.daily.map((x) => (
              <div className="col" key={x.date}>
                <div className="col-val">{compact(x.sessions)}</div>
                <div className="col-track">
                  <div className="col-bar" style={{ height: `${(x.sessions / max) * 100}%` }} />
                </div>
                <div className="col-lbl">
                  {weekday(`${x.date.slice(0, 4)}-${x.date.slice(4, 6)}-${x.date.slice(6, 8)}`, "short")}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="label">Mest besøkte sider</div>
          <BarList rows={d.topPages.map((p) => ({ name: p.path, value: p.views }))} format={compact} />
        </section>
        <section className="card">
          <div className="label">Kanaler (økter)</div>
          <BarList rows={d.channels.slice(0, 5).map((c) => ({ name: CHANNEL_NB[c.name] ?? c.name, value: c.sessions }))} format={(n) => nf(n)} />
        </section>
      </div>
    </div>
  );
}
