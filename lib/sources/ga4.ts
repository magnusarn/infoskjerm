import { GoogleAuth } from "google-auth-library";

/**
 * GA4 Data API via servicekonto.
 * 1) Google Cloud Console: lag prosjekt → aktiver «Google Analytics Data API»
 * 2) Lag en servicekonto → Nøkler → Legg til nøkkel (JSON)
 * 3) GA4 → Admin → Tilgangsadministrasjon for egenskap → legg til servicekontoens e-post som «Leser»
 * 4) I Vercel: GA4_PROPERTY_ID = tallet (f.eks. 123456789)
 *              GOOGLE_SERVICE_ACCOUNT_JSON = hele innholdet i JSON-fila
 */

export type Kpi = { value: number; previous: number };
export type Ga4Data =
  | {
      kpis: { users: Kpi; sessions: Kpi; keyEvents: Kpi; views: Kpi };
      daily: { date: string; sessions: number }[];
      topPages: { path: string; views: number }[];
      channels: { name: string; sessions: number }[];
    }
  | { notConfigured: true; hint: string };

export async function getGa4(): Promise<Ga4Data> {
  const property = process.env.GA4_PROPERTY_ID;
  const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!property || !credsRaw)
    return { notConfigured: true, hint: "Legg inn GA4_PROPERTY_ID og GOOGLE_SERVICE_ACCOUNT_JSON i Vercel" };

  const credentials = JSON.parse(credsRaw.trim().startsWith("{") ? credsRaw : Buffer.from(credsRaw, "base64").toString());
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
  const token = await (await auth.getClient()).getAccessToken();

  const cur = { startDate: "7daysAgo", endDate: "yesterday" };
  const body = {
    requests: [
      {
        dateRanges: [
          { ...cur, name: "cur" },
          { startDate: "14daysAgo", endDate: "8daysAgo", name: "prev" },
        ],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "keyEvents" }, { name: "screenPageViews" }],
      },
      {
        dateRanges: [cur],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
      {
        dateRanges: [cur],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5,
      },
      {
        dateRanges: [cur],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      },
    ],
  };

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`GA4 svarte ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const [totals, daily, pages, channels] = (await res.json()).reports;

  const num = (v: any) => Number(v?.value ?? 0);
  const rowFor = (name: string) =>
    totals.rows?.find((r: any) => r.dimensionValues?.some((d: any) => d.value === name))?.metricValues ?? [];
  const c = rowFor("cur");
  const p = rowFor("prev");
  const kpi = (i: number): Kpi => ({ value: num(c[i]), previous: num(p[i]) });

  return {
    kpis: { users: kpi(0), sessions: kpi(1), keyEvents: kpi(2), views: kpi(3) },
    daily: (daily.rows ?? []).map((r: any) => ({ date: r.dimensionValues[0].value, sessions: num(r.metricValues[0]) })),
    topPages: (pages.rows ?? []).map((r: any) => ({ path: r.dimensionValues[0].value, views: num(r.metricValues[0]) })),
    channels: (channels.rows ?? []).map((r: any) => ({ name: r.dimensionValues[0].value, sessions: num(r.metricValues[0]) })),
  };
}
