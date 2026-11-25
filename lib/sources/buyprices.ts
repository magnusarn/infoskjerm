/**
 * «I dag kjøper vi for» – leser tabellen på karasmussen.com/metallpriser/.
 * Tabellen er servergenerert (WordPress-kortkode), så vi henter HTML-en og plukker ut radene.
 */
import type { BuyPricesSlide } from "../types";

export type BuyItem = { name: string; price: number; unit: string };
export type BuyPricesData = {
  groups: { title: string; unit: string; items: BuyItem[] }[];
  updated?: string; // tekst fra siden, f.eks. «25/11 kl 08:08 GMT»
  fetchedAt: string;
};

const strip = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();

export async function getBuyPrices(s: BuyPricesSlide): Promise<BuyPricesData> {
  const res = await fetch(s.url, { next: { revalidate: 600 }, headers: { "User-Agent": "infoskjerm/1.0" } });
  if (!res.ok) throw new Error(`Nettsiden svarte ${res.status}`);
  const html = await res.text();

  const start = html.search(/I dag kjøper vi for/i);
  if (start < 0) throw new Error("Fant ikke «I dag kjøper vi for» på siden");
  const tStart = html.indexOf("<tbody", start);
  const tEnd = html.indexOf("</tbody>", tStart);
  if (tStart < 0 || tEnd < 0) throw new Error("Fant ikke pristabellen");

  const items: BuyItem[] = [];
  for (const row of html.slice(tStart, tEnd).split(/<tr[\s>]/).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]));
    if (cells.length < 2) continue;
    const price = Number(cells[1].replace(/[^\d,]/g, "").replace(",", "."));
    if (!cells[0] || !price) continue;
    items.push({ name: cells[0], price, unit: (cells[2] || "").replace("/", "").replace("pcs", "stk") });
  }
  if (!items.length) throw new Error("Pristabellen var tom");

  const updated = strip(html.slice(tEnd, tEnd + 3000)).match(/Last updated ([^.<]*?GMT)/i)?.[1];
  const by = (unit: string) => items.filter((i) => i.unit === unit).sort((a, b) => b.price - a.price);
  const groups = [
    { title: "Gull", unit: "g", items: by("g") },
    { title: "Sølv", unit: "kg", items: by("kg") },
    { title: "Mynter og barrer", unit: "stk", items: by("stk") },
  ].filter((g) => g.items.length);
  // Ukjente enheter havner i en egen gruppe så ingenting forsvinner
  const other = items.filter((i) => !["g", "kg", "stk"].includes(i.unit));
  if (other.length) groups.push({ title: "Annet", unit: "", items: other });

  return { groups, updated, fetchedAt: new Date(res.headers.get("date") ?? Date.now()).toISOString() };
}
