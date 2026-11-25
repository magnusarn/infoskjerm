import type { BuyPricesData } from "@/lib/sources/buyprices";
import { hhmm, nf } from "../format";

const UNIT: Record<string, string> = { g: "per gram", kg: "per kilo", stk: "per stk" };

export default function BuyPricesView({ d, title }: { d: BuyPricesData; title: string }) {
  return (
    <div className="buy">
      <h1 className="title">{title}</h1>
      <div
        className="buy-grid"
        style={{
          // Gruppen med flest varer får mest plass
          gridTemplateColumns: d.groups.map((g) => `minmax(0, ${Math.max(1, g.items.length / 8)}fr)`).join(" "),
        }}
      >
        {d.groups.map((g) => (
          <section className="card buy-col" key={g.title}>
            <div className="buy-head">
              <span className="label">{g.title}</span>
              <span className="buy-unit">{UNIT[g.unit] ?? ""}</span>
            </div>
            <div className="buy-rows">
              {g.items.map((it) => (
                <div className="buy-row" key={it.name}>
                  <span className="buy-name">{it.name.replace(/\bSirkulert\b/g, "Sirk.")}</span>
                  <span className="buy-price">{nf(it.price)} kr</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="buy-note">
        Veiledende priser · oppdateres flere ganger daglig
        {d.updated ? ` · sist oppdatert ${d.updated.replace(/GMT/, "").trim()} (GMT)` : ` · hentet kl. ${hhmm(d.fetchedAt)}`}
      </div>
    </div>
  );
}
