import ical, { type VEvent } from "node-ical";
import type { CalendarSlide } from "../types";

export type CalEvent = { title: string; start: string; end: string; allDay: boolean; location?: string };
export type CalendarData = { events: CalEvent[] } | { notConfigured: true; hint: string };

/**
 * Leser en publisert kalender (ICS-lenke).
 * Outlook: Innstillinger → Kalender → Delte kalendere → Publiser en kalender → kopier ICS-lenken.
 * Google: Kalenderinnstillinger → «Hemmelig adresse i iCal-format».
 * Lim lenken inn i CALENDAR_ICS_URL i Vercel.
 */
export async function getCalendar(s: CalendarSlide): Promise<CalendarData> {
  const url = process.env.CALENDAR_ICS_URL;
  if (!url) return { notConfigured: true, hint: "Legg inn ICS-lenken til kalenderen i CALENDAR_ICS_URL" };

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Kalenderen svarte ${res.status}`);
  const data = ical.sync.parseICS(await res.text());

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + (s.days ?? 7) * 86400_000);

  const events: CalEvent[] = [];
  for (const item of Object.values(data)) {
    if (!item || (item as any).type !== "VEVENT") continue;
    const ev = item as VEvent;
    try {
      for (const inst of ical.expandRecurringEvent(ev, { from, to, expandOngoing: true })) {
        const summary: any = inst.summary;
        events.push({
          title: (typeof summary === "string" ? summary : summary?.val) || "(uten tittel)",
          start: new Date(inst.start).toISOString(),
          end: new Date(inst.end ?? inst.start).toISOString(),
          allDay: Boolean(inst.isFullDay),
          location: typeof ev.location === "string" ? ev.location : undefined,
        });
      }
    } catch {
      /* hopp over hendelser som ikke lar seg tolke */
    }
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return { events: events.filter((e) => new Date(e.end) >= new Date()).slice(0, 12) };
}
