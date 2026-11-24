import { NextRequest, NextResponse } from "next/server";
import { SCREENS } from "@/lib/config";
import { hasAccess } from "@/lib/auth";
import { demoData } from "@/lib/demo";
import { getWeather } from "@/lib/sources/weather";
import { getDepartures } from "@/lib/sources/departures";
import { getCalendar } from "@/lib/sources/calendar";
import { getNews } from "@/lib/sources/news";
import { getGa4 } from "@/lib/sources/ga4";
import { getMeta } from "@/lib/sources/meta";

export const dynamic = "force-dynamic";

/** GET /api/data?screen=kontor-1&i=0[&key=…][&demo=1] → data for én slide */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const screen = SCREENS[q.get("screen") ?? ""];
  const slide = screen?.slides[Number(q.get("i"))];
  if (!screen || !slide) return NextResponse.json({ error: "Ukjent skjerm eller slide" }, { status: 404 });
  if (!hasAccess(screen, q.get("key"))) return NextResponse.json({ error: "Mangler gyldig nøkkel" }, { status: 401 });

  if (q.get("demo") === "1" || process.env.DEMO === "1") return NextResponse.json(demoData(slide));

  try {
    const data = await (() => {
      switch (slide.type) {
        case "weather":
          return getWeather(slide);
        case "departures":
          return getDepartures(slide);
        case "calendar":
          return getCalendar(slide);
        case "news":
          return getNews(slide);
        case "ga4":
          return getGa4();
        case "meta":
          return getMeta();
        default:
          return null;
      }
    })();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(`[data] ${slide.type}`, e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
