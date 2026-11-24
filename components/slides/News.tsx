import type { NewsData } from "@/lib/sources/news";
import { hhmm } from "../format";

export default function NewsView({ d, title }: { d: NewsData; title: string }) {
  const [first, ...rest] = d.items;
  return (
    <div className="news">
      <h1 className="title">{title}</h1>
      {first && (
        <section className="news-top card">
          <div className="label">
            {d.source}
            {first.published && ` · ${hhmm(first.published)}`}
          </div>
          <div className="headline">{first.title}</div>
        </section>
      )}
      <div className="news-list">
        {rest.slice(0, 5).map((n, i) => (
          <div className="news-item" key={i}>
            <span className="t">{n.published ? hhmm(n.published) : ""}</span>
            <span className="h">{n.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
