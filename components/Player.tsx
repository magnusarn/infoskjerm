"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DATA_TYPES, REFRESH, type Slide } from "@/lib/types";
import Clock from "./Clock";
import WeatherView from "./slides/Weather";
import DeparturesView from "./slides/Departures";
import CalendarView from "./slides/Calendar";
import NewsView from "./slides/News";
import Ga4View from "./slides/Ga4";
import MetaView from "./slides/Meta";
import MarketsView from "./slides/Markets";
import SkiView from "./slides/Ski";
import TrafficView from "./slides/Traffic";
import { IframeView, YoutubeView, ImageView, MessageView } from "./slides/Embeds";

type Props = {
  screenId: string;
  name: string;
  slides: Slide[];
  query: { key?: string; demo?: string };
  unprotected: boolean;
  /** ?slide=2 låser visningen til én slide (nyttig ved oppsett) */
  only?: number;
};

type Entry = { data?: any; error?: string; at?: number };

const SOURCES: Record<string, string> = {
  weather: "Værdata: MET Norway / Yr",
  departures: "Sanntid: Entur",
  news: "",
  ga4: "Kilde: Google Analytics 4",
  meta: "Kilde: Meta Ads",
  markets: "Metallpriser: K.A. Rasmussen (LME) · Valuta: Norges Bank",
  traffic: "Reisetid: TomTom · Trafikkmeldinger: Statens vegvesen",
  ski: "Snø: NVE / seNorge (modellberegnet) · Vær og webkamera: MET Norway / Yr",
};

export default function Player({ screenId, name, slides, query, unprotected, only }: Props) {
  const [index, setIndex] = useState(only ?? 0);
  const [cache, setCache] = useState<Record<number, Entry>>({});
  const [online, setOnline] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  // ── Skaler 1920×1080-scenen til hvilken som helst skjerm ──
  useEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      stageRef.current?.style.setProperty("--scale", String(s));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // ── Hent data for alle dataslides, og oppdater jevnlig ──
  const load = useCallback(
    async (i: number) => {
      const qs = new URLSearchParams({ screen: screenId, i: String(i) });
      if (query.key) qs.set("key", query.key);
      if (query.demo) qs.set("demo", query.demo);
      try {
        const res = await fetch(`/api/data?${qs}`, { cache: "no-store" });
        const json = await res.json();
        setOnline(true);
        setCache((c) => ({
          ...c,
          // Ved feil beholder vi siste gode data, men noterer feilen
          [i]: res.ok ? { data: json, at: Date.now() } : { ...c[i], error: json.error ?? `Feil ${res.status}` },
        }));
      } catch {
        setOnline(false);
      }
    },
    [screenId, query.key, query.demo]
  );

  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    slides.forEach((s, i) => {
      if (!(DATA_TYPES as readonly string[]).includes(s.type)) return;
      load(i);
      timers.push(setInterval(() => load(i), (REFRESH[s.type] ?? 300) * 1000));
    });
    return () => timers.forEach(clearInterval);
  }, [slides, load]);

  // ── Skjul slides som ikke er koblet til ennå (mangler nøkler, lenke eller video) ──
  const hidden = (i: number) => {
    if (only !== undefined) return false;
    const sl = slides[i];
    if (sl.type === "iframe" && !sl.url) return true;
    if (sl.type === "youtube" && !sl.videoId && !sl.playlistId) return true;
    return Boolean(cache[i]?.data?.notConfigured);
  };
  const visible = slides.map((_, i) => i).filter((i) => !hidden(i));

  // Står vi på en slide som nettopp ble skjult, hopp videre med en gang
  useEffect(() => {
    if (hidden(index) && visible.length) setIndex(visible.find((i) => i > index) ?? visible[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, index]);

  // ── Rotasjon ──
  useEffect(() => {
    if (only !== undefined || visible.length < 2) return;
    const next = visible.find((i) => i > index) ?? visible[0];
    const t = setTimeout(() => setIndex(next), slides[index].seconds * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides, only, visible.join(",")]);

  // ── Last siden på nytt ved ny deploy, og uansett hver 6. time ──
  useEffect(() => {
    let first: string | undefined;
    const check = async () => {
      try {
        const { version } = await (await fetch("/api/version", { cache: "no-store" })).json();
        if (first === undefined) first = version;
        else if (version !== first) location.reload();
      } catch {}
    };
    check();
    const a = setInterval(check, 2 * 60_000);
    const b = setTimeout(() => location.reload(), 6 * 3600_000);
    return () => (clearInterval(a), clearTimeout(b));
  }, []);

  if (!visible.length) {
    return (
      <div className="viewport">
        <div className="stage" ref={stageRef}>
          <header className="topbar">
            <div className="brand">{name}</div>
            <Clock />
          </header>
        </div>
      </div>
    );
  }

  const slide = slides[index];
  const entry = cache[index];
  const source = slide.type === "news" ? `Kilder: ${slide.feeds.map((f) => f.name).join(", ")}` : SOURCES[slide.type] ?? "";
  const fullBleed = slide.type === "youtube" || slide.type === "image";

  return (
    <div className="viewport">
      <div className="stage" ref={stageRef}>
        {!fullBleed && (
          <header className="topbar">
            <div className="brand">{name}</div>
            <Clock />
          </header>
        )}

        <main className={fullBleed ? "content full" : "content"} key={index}>
          <SlideView slide={slide} entry={entry} active />
        </main>

        <footer className={fullBleed ? "bottombar overlay" : "bottombar"}>
          <div className="dots">
            {visible.map((i) => (
              <span key={i} className={i === index ? "dot on" : "dot"} />
            ))}
          </div>
          <div className="meta">
            {unprotected && <span className="warn">Ikke beskyttet – sett SCREEN_KEY</span>}
            {!online && <span className="warn">Frakoblet – viser siste data</span>}
            {entry?.error && entry.data && <span className="warn">Kunne ikke oppdatere</span>}
            {query.demo === "1" && <span className="demo">DEMO-DATA</span>}
            <span>{source}</span>
          </div>
          {only === undefined && visible.length > 1 && (
            <div className="progress" key={`p${index}`} style={{ animationDuration: `${slide.seconds}s` }} />
          )}
        </footer>
      </div>
    </div>
  );
}

function SlideView({ slide, entry, active }: { slide: Slide; entry?: Entry; active: boolean }) {
  const isData = (DATA_TYPES as readonly string[]).includes(slide.type);
  if (isData) {
    if (!entry?.data) {
      return entry?.error ? (
        <div className="status error">
          <h2>Fikk ikke hentet data</h2>
          <p>{entry.error}</p>
        </div>
      ) : (
        <div className="status">Laster …</div>
      );
    }
    if (entry.data.notConfigured) {
      return (
        <div className="status setup">
          <h2>Ikke koblet til ennå</h2>
          <p>{entry.data.hint}</p>
        </div>
      );
    }
  }
  const d = entry?.data;
  switch (slide.type) {
    case "weather":
      return <WeatherView d={d} />;
    case "departures":
      return <DeparturesView d={d} />;
    case "calendar":
      return <CalendarView d={d} title={slide.title} />;
    case "news":
      return <NewsView d={d} title={slide.title} />;
    case "ga4":
      return <Ga4View d={d} title={slide.title} />;
    case "meta":
      return <MetaView d={d} title={slide.title} />;
    case "markets":
      return <MarketsView d={d} title={slide.title} />;
    case "traffic":
      return <TrafficView d={d} title={slide.title} />;
    case "ski":
      return <SkiView d={d} title={slide.title} />;
    case "iframe":
      return <IframeView slide={slide} />;
    case "youtube":
      return active ? <YoutubeView slide={slide} /> : null;
    case "image":
      return <ImageView slide={slide} />;
    case "message":
      return <MessageView slide={slide} />;
  }
}
