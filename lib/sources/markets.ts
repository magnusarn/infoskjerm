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
  /** Internasjonal spotpris i USD per troy unse, med endring i dag (prosent) */
  usd?: { price: number; changeToday: number | null };
  fetchedAt: string;
};
export type Fx = {
  code: string;
  label: string;
  rate: number;
  date: string;
  changeDay: number | null;
  changeWeek: number | null;
  /** Kronens utvikling mot valutaen (positiv = sterkere krone) */
  kroneDay: number | null;
  kroneWeek: number | null;
  fetchedAt: string;
};
/** Importveid kronekurs (I-44). Lavere tall = sterkere krone. */
export type KroneIndex = { value: number; date: string; kroneDay: number | null; kroneWeek: number | null; fetchedAt: string };
export type MarketsData = { metals: Metal[]; fx: Fx[]; krone?: KroneIndex; failed?: string[] };

const pct = (now: number, then?: number) => (then ? ((now - then) / then) * 100 : null);
/** Kronens endring når kursen er oppgitt som NOK per valuta: flere kroner per valuta = svakere krone */
const kronePct = (now: number, then?: number) => (then ? (then / now - 1) * 100 : null);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Når svaret faktisk ble hentet fra kilden (Date-headeren følger med i Next sin cache) */
const fetchedAt = (res: Response) => {
  const d = new Date(res.headers.get("date") ?? "");
  return (isNaN(+d) ? new Date() : d).toISOString();
};

async function getMetals(): Promise<Metal[]> {
  const to = new Date();
  const from = new Date(Date.now() - 40 * 86400_000);
  const [spotRes, histRes] = await Promise.all([
    fetch(`${KAR}/spot-metal-prices`, { next: { revalidate: 60 } }),
    fetch(`${KAR}/prices?from=${ymd(from)}&to=${ymd(to)}`, { next: { revalidate: 3600 } }),
  ]);
  if (!spotRes.ok) throw new Error(`Spotpris svarte ${spotRes.status}`);
  const spotJson = JSON.parse((await spotRes.text()).trim());
  const spot = spotJson.primary;
  const swap = spotJson.swap ?? {};
  const spotAt = fetchedAt(spotRes);
  const hist: any[] = histRes.ok ? JSON.parse((await histRes.text()).trim()) : [];

  const defs = [
    { code: "XAU" as const, hist: "AU", name: "Gull" },
    { code: "XAG" as const, hist: "AG", name: "Sølv" },
  ];
  return defs.map((d) => {
    const s = spot[d.code];
    const u = swap[d.code];
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
      usd:
        u && u.currency === "USD" && u.unit === "oz" && typeof u.price === "number"
          ? { price: u.price, changeToday: typeof u.change === "number" ? u.change : null }
          : undefined,
      fetchedAt: spotAt,
    };
  });
}

async function getFx(): Promise<{ fx: Fx[]; krone?: KroneIndex }> {
  const res = await fetch(
    "https://data.norges-bank.no/api/data/EXR/B.USD+EUR+SEK+I44.NOK.SP?format=csv&lastNObservations=8&locale=en",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Norges Bank svarte ${res.status}`);
  const [head, ...lines] = (await res.text()).trim().split("\n");
  const fxAt = fetchedAt(res);
  const cols = head.split(";");
  const at = (name: string) => cols.indexOf(name);
  const rows = lines.map((l) => l.split(";"));
  const series = (code: string) =>
    rows
      .filter((r) => r[at("BASE_CUR")] === code)
      .map((r) => ({ date: r[at("TIME_PERIOD")], value: Number(r[at("OBS_VALUE")]), mult: Number(r[at("UNIT_MULT")]) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  const weekRef = (obs: { date: string; value: number }[]) => {
    const last = obs[obs.length - 1];
    const weekAgo = ymd(new Date(new Date(last.date).getTime() - 7 * 86400_000));
    return [...obs].reverse().find((o) => o.date <= weekAgo);
  };

  const fx = (["USD", "EUR", "SEK"] as const).map((code) => {
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
      kroneDay: kronePct(last.value, obs[obs.length - 2]?.value),
      kroneWeek: kronePct(last.value, ref?.value),
      fetchedAt: fxAt,
    };
  });

  const i44 = series("I44");
  const lastI = i44[i44.length - 1];
  const krone = lastI && {
    value: lastI.value,
    date: lastI.date,
    // Indeksen er «kroner per kurv»: lavere = sterkere krone
    kroneDay: kronePct(lastI.value, i44[i44.length - 2]?.value),
    kroneWeek: kronePct(lastI.value, weekRef(i44)?.value),
    fetchedAt: fxAt,
  };
  return { fx, krone };
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
    fx: fx.status === "fulfilled" ? fx.value.fx : [],
    krone: fx.status === "fulfilled" ? fx.value.krone : undefined,
    failed: failed.length ? failed : undefined,
  };
}
