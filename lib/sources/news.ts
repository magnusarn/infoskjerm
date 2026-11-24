import { XMLParser } from "fast-xml-parser";
import type { Feed, NewsSlide } from "../types";

export type NewsItem = { title: string; source: string; published?: string };
export type NewsData = { sources: string[]; items: NewsItem[]; failed?: string[] };

const parser = new XMLParser({ ignoreAttributes: false });
const text = (v: any) => (typeof v === "string" ? v : v?.["#text"] ?? "");

async function readFeed(feed: Feed): Promise<NewsItem[]> {
  let lastError = "";
  for (const url of feed.urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 }, headers: { "User-Agent": "infoskjerm/1.0" } });
      if (!res.ok) throw new Error(`${res.status}`);
      const xml = parser.parse(await res.text());
      const raw = xml?.rss?.channel?.item ?? xml?.feed?.entry;
      if (!raw) throw new Error("ingen artikler");
      const list = Array.isArray(raw) ? raw : [raw];
      return list.slice(0, 15).map((i: any) => ({
        title: text(i.title).trim(),
        source: feed.name,
        published: i.pubDate || i.published || i.updated || i["dc:date"] || undefined,
      }));
    } catch (e) {
      lastError = `${url}: ${(e as Error).message}`;
    }
  }
  throw new Error(lastError);
}

/** Henter alle kildene, slår dem sammen og sorterer nyeste først. En kilde som feiler hoppes over. */
export async function getNews(s: NewsSlide): Promise<NewsData> {
  const results = await Promise.allSettled(s.feeds.map(readFeed));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [`${s.feeds[i].name} (${r.reason?.message})`] : []));
  if (!items.length) throw new Error(`Ingen nyhetskilder svarte: ${failed.join("; ")}`);
  const time = (i: NewsItem) => (i.published ? new Date(i.published).getTime() || 0 : 0);
  items.sort((a, b) => time(b) - time(a));
  return {
    sources: s.feeds.map((f) => f.name).filter((n) => items.some((i) => i.source === n)),
    items: items.filter((i) => i.title).slice(0, s.max ?? 7),
    failed: failed.length ? failed : undefined,
  };
}
