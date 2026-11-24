/**
 * Gull, sølv og valuta.
 * - Metallpriser: K.A. Rasmussens eget API på https://karasmussen.com (data på lisens fra LME)
 *     spot:      /wp-json/price-history/v1/spot-metal-prices  (pris i NOK + endring i dag)
 *     historikk: /wp-json/price-history/v1/prices?from=&to=  (daglige fiksingspriser)
 * - Valuta: Norges Bank (åpent API, ingen nøkkel)
 */

const KAR = "https://karasmussen.com/wp-json/price-history/v1";

export type Metal = {
  code: "XAU" | "XAG";
  name: string;
  price: number;
  unit: string; // "g" | "kg"
  changeToday: number | null; // prosent
  changeWeek: number | null; // prosent
  history: { date: string; price: number }[];
};
export type Fx = { code: string; label: string; rate: number; date: string; changeDay: number | null; changeWeek: number | null };
export type MarketsData = { metals: Metal[]; fx: Fx[]; failed?: string[] };

const pct = (now: number, then?: number) => (then ? ((now - then) / then) * 100 : null);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function getMetals(): Promise<Metal[]> {
  const to = new Date();
  const from = new Date(Date.now() - 40 * 86400_000);
  const [spotRes, histRes] = await Promise.all([
    fetch(`${KAR}/spot-metal-prices`, { next: { revalidate: 60 } }),
    fetch(`${KAR}/prices?from=${ymd(from)}&to=${ymd(to)}`, { next: { revalidate: 3600 } }),
  ]);
  if (!spotRes.ok) throw new Error(`Spotpris svarte ${spotRes.status}`);
  const spot = JSON.parse((await spotRes.text()).trim()).primary;
  const hist: any[] = histRes.ok ? JSON.parse((await histRes.text()).trim()) : [];

  const defs = [
    { code: "XAU" as const, hist: "AU", name: "Gull" },
    { code: "XAG" as const, hist: "AG", name: "Sølv" },
  ];
  return defs.map((d) => {
    const s = spot[d.code];
    const factor = s.unit === "kg" ? 1000 : 1;
    const series = (hist.find((h) => h.Code === d.hist)?.Prices ?? [])
      .filter((p: any) => p.Currency === "NOK")
      .map((p: any) => ({ date: p.TradeTime.slice(0, 10), price: p.BidGram * factor }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    const weekAgo = ymd(new Date(Date.now() - 7 * 86400_000));
    const ref = [...series].reverse().find((p: any) => p.date <= weekAgo);
    return {
      code: d.code,
      name: d.name,
      price: s.price,
      unit: s.unit,
      changeToday: typeof s.change === "number" ? s.change : null,
      changeWeek: pct(s.price, ref?.price),
      history: series.slice(-30),
    };
  });
}

async function getFx(): Promise<Fx[]> {
  const res = await fetch(
    "https://data.norges-bank.no/api/data/EXR/B.USD+EUR+SEK.NOK.SP?format=csv&lastNObservations=8&locale=en",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Norges Bank svarte ${res.status}`);
  const [head, ...lines] = (await res.text()).trim().split("\n");
  const cols = head.split(";");
  const at = (name: string) => cols.indexOf(name);
  const rows = lines.map((l) => l.split(";"));
  return (["USD", "EUR", "SEK"] as const).map((code) => {
    const obs = rows
      .filter((r) => r[at("BASE_CUR")] === code)
      .map((r) => ({ date: r[at("TIME_PERIOD")], value: Number(r[at("OBS_VALUE")]), mult: Number(r[at("UNIT_MULT")]) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const last = obs[obs.length - 1];
    if (!last) throw new Error(`Mangler kurs for ${code}`);
    const weekAgo = ymd(new Date(new Date(last.date).getTime() - 7 * 86400_000));
    const ref = [...obs].reverse().find((o) => o.date <= weekAgo);
    return {
      code,
      label: last.mult ? `${10 ** last.mult} ${code}` : `1 ${code}`,
      rate: last.value,
      date: last.date,
      changeDay: pct(last.value, obs[obs.length - 2]?.value),
      changeWeek: pct(last.value, ref?.value),
    };
  });
}

export async function getMarkets(): Promise<MarketsData> {
  const [metals, fx] = await Promise.allSettled([getMetals(), getFx()]);
  const failed = [
    ...(metals.status === "rejected" ? [`Metallpriser: ${metals.reason?.message}`] : []),
    ...(fx.status === "rejected" ? [`Valuta: ${fx.reason?.message}`] : []),
  ];
  if (failed.length === 2) throw new Error(failed.join("; "));
  return {
    metals: metals.status === "fulfilled" ? metals.value : [],
    fx: fx.status === "fulfilled" ? fx.value : [],
    failed: failed.length ? failed : undefined,
  };
}
