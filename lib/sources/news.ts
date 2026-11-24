import { XMLParser } from "fast-xml-parser";
import type { Feed, NewsSlide } from "../types";

export type NewsItem = { title: string; source: string; published?: string };
export type NewsData = { sources: string[]; items: NewsItem[]; failed?: string[]; used?: Record<string, string> };

const parser = new XMLParser({ ignoreAttributes: false });
const text = (v: any) => (typeof v === "string" ? v : v?.["#text"] ?? "");

async function readFeed(feed: Feed): Promise<{ url: string; items: NewsItem[] }> {
  const errors: string[] = [];
  for (const url of feed.urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 }, headers: { "User-Agent": "infoskjerm/1.0" } });
      if (!res.ok) throw new Error(`${res.status}`);
      const xml = parser.parse(await res.text());
      const raw = xml?.rss?.channel?.item ?? xml?.feed?.entry;
      if (!raw) throw new Error("ingen artikler");
      const list = Array.isArray(raw) ? raw : [raw];
      const items = list.slice(0, 15).map((i: any) => ({
        title: text(i.title).trim(),
        source: feed.name,
        published: i.pubDate || i.published || i.updated || i["dc:date"] || undefined,
      }));
      return { url, items };
    } catch (e) {
      errors.push(`${url}: ${(e as Error).message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

/** Henter alle kildene og fletter dem annenhver (nyeste først fra hver), så alle kilder får plass. En kilde som feiler hoppes over. */
export async function getNews(s: NewsSlide): Promise<NewsData> {
  const results = await Promise.allSettled(s.feeds.map(readFeed));
  const time = (i: NewsItem) => (i.published ? new Date(i.published).getTime() || 0 : 0);
  const lists = results.map((r) =>
    r.status === "fulfilled"
      ? r.value.items
          // Skjul saker eldre enn 3 døgn (saker uten dato beholdes)
          .filter((i) => i.title && (!time(i) || Date.now() - time(i) < 3 * 86400_000))
          .sort((a, b) => time(b) - time(a))
      : []
  );
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [`${s.feeds[i].name} (${r.reason?.message})`] : []));
  const used = Object.fromEntries(
    results.flatMap((r, i) => (r.status === "fulfilled" ? [[s.feeds[i].name, r.value.url]] : []))
  );

  const max = s.max ?? 7;
  const items: NewsItem[] = [];
  for (let round = 0; items.length < max && lists.some((l) => l.length > round); round++) {
    for (const l of lists) if (l[round] && items.length < max) items.push(l[round]);
  }
  if (!items.length) throw new Error(`Ingen nyhetskilder svarte: ${failed.join("; ")}`);
  return {
    sources: s.feeds.map((f) => f.name).filter((n) => items.some((i) => i.source === n)),
    items,
    failed: failed.length ? failed : undefined,
    used,
  };
}
