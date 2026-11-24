import { XMLParser } from "fast-xml-parser";
import type { NewsSlide } from "../types";

export type NewsData = { source: string; items: { title: string; published?: string }[] };

export async function getNews(s: NewsSlide): Promise<NewsData> {
  const res = await fetch(s.feedUrl, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`Nyhetsfeeden svarte ${res.status}`);
  const xml = new XMLParser({ ignoreAttributes: false }).parse(await res.text());
  const raw = xml?.rss?.channel?.item ?? xml?.feed?.entry ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  const text = (v: any) => (typeof v === "string" ? v : v?.["#text"] ?? "");
  return {
    source: s.sourceName,
    items: list.slice(0, 7).map((i: any) => ({
      title: text(i.title).trim(),
      published: i.pubDate || i.published || i.updated || undefined,
    })),
  };
}
