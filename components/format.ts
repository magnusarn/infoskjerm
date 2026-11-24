export const TZ = "Europe/Oslo";

export const nf = (n: number, digits = 0) =>
  n.toLocaleString("nb-NO", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const compact = (n: number) =>
  n >= 1_000_000 ? `${nf(n / 1_000_000, 1)} mill.` : n >= 10_000 ? `${nf(n / 1000, 1)}k` : nf(n);

export const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const weekday = (d: string | Date, style: "long" | "short" = "long") =>
  new Date(typeof d === "string" && d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("nb-NO", {
    timeZone: TZ,
    weekday: style,
  });

export const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });

export function change(cur: number, prev: number) {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

/** MET symbol_code → emoji + norsk tekst */
export function weatherSymbol(code: string): { icon: string; text: string } {
  const night = code.endsWith("_night");
  const c = code.replace(/_(day|night|polartwilight)$/, "");
  if (c.includes("thunder")) return { icon: "⛈️", text: "Torden" };
  if (c.includes("sleet")) return { icon: "🌨️", text: c.includes("showers") ? "Sluddbyger" : "Sludd" };
  if (c.includes("snow")) return { icon: "❄️", text: c.includes("showers") ? "Snøbyger" : c.startsWith("light") ? "Lett snø" : c.startsWith("heavy") ? "Kraftig snø" : "Snø" };
  if (c.includes("rainshowers")) return { icon: "🌦️", text: "Regnbyger" };
  if (c.includes("rain")) return { icon: "🌧️", text: c.startsWith("light") ? "Lett regn" : c.startsWith("heavy") ? "Kraftig regn" : "Regn" };
  if (c === "fog") return { icon: "🌫️", text: "Tåke" };
  if (c === "cloudy") return { icon: "☁️", text: "Skyet" };
  if (c === "partlycloudy") return { icon: night ? "☁️" : "⛅", text: "Delvis skyet" };
  if (c === "fair") return { icon: night ? "🌙" : "🌤️", text: "Lettskyet" };
  if (c === "clearsky") return { icon: night ? "🌙" : "☀️", text: "Klarvær" };
  return { icon: "☁️", text: "" };
}

export const MODE_ICON: Record<string, string> = {
  bus: "🚌",
  coach: "🚌",
  metro: "🚇",
  tram: "🚊",
  rail: "🚆",
  water: "⛴️",
  air: "✈️",
};
