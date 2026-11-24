import type { NewsData } from "@/lib/sources/news";
import { hhmm } from "../format";

export default function NewsView({ d, title }: { d: NewsData; title: string }) {
  const [first, ...rest] = d.items;
  const multi = d.sources.length > 1;
  return (
    <div className="news">
      <h1 className="title">{title}</h1>
      {first && (
        <section className="news-top card">
          <div className="label">
            {first.source}
            {first.published && ` · ${hhmm(first.published)}`}
          </div>
          <div className="headline">{first.title}</div>
          {first.lead && first.lead !== first.title && <p className="lead">{first.lead}</p>}
        </section>
      )}
      <div className="news-list">
        {rest.slice(0, 3).map((n, i) => (
          <div className={multi ? "news-item multi" : "news-item"} key={i}>
            <span className="t">{n.published ? hhmm(n.published) : ""}</span>
            {multi && <span className="src">{n.source}</span>}
            <div className="body">
              <div className="h">{n.title}</div>
              {n.lead && n.lead !== n.title && <div className="l">{n.lead}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
