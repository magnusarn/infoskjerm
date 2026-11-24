/**
 * Meta Marketing API (Insights).
 * 1) Business Manager → Innstillinger → Systembrukere → lag systembruker (rolle: Admin eller Ansatt)
 * 2) Gi systembrukeren tilgang til annonsekontoen
 * 3) «Generer ny token» med tillatelsen ads_read
 * 4) I Vercel: META_ACCESS_TOKEN = token, META_AD_ACCOUNT_ID = tallene etter «act_»
 */

const VERSION = process.env.META_API_VERSION || "v23.0";

export type MetaData =
  | {
      currency: string;
      cur: { spend: number; impressions: number; reach: number; clicks: number; ctr: number; cpc: number };
      prev: { spend: number; impressions: number; reach: number; clicks: number; ctr: number; cpc: number };
      campaigns: { name: string; spend: number; impressions: number; clicks: number }[];
    }
  | { notConfigured: true; hint: string };

export async function getMeta(): Promise<MetaData> {
  const token = process.env.META_ACCESS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, "");
  if (!token || !account)
    return { notConfigured: true, hint: "Legg inn META_ACCESS_TOKEN og META_AD_ACCOUNT_ID i Vercel" };

  const base = `https://graph.facebook.com/${VERSION}/act_${account}`;
  const get = async (params: Record<string, string>) => {
    const qs = new URLSearchParams({ ...params, access_token: token });
    const res = await fetch(`${base}/insights?${qs}`, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Meta svarte ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).data as any[];
  };

  const day = 86400_000;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  const prevRange = JSON.stringify({ since: fmt(new Date(+today - 14 * day)), until: fmt(new Date(+today - 8 * day)) });
  const fields = "spend,impressions,reach,clicks,ctr,cpc,account_currency";

  const [cur, prev, campaigns] = await Promise.all([
    get({ date_preset: "last_7d", fields, level: "account" }),
    get({ time_range: prevRange, fields, level: "account" }),
    get({ date_preset: "last_7d", fields: "campaign_name,spend,impressions,clicks", level: "campaign", sort: "spend_descending", limit: "5" }),
  ]);

  const pick = (r: any = {}) => ({
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    reach: Number(r.reach ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
  });

  return {
    currency: cur[0]?.account_currency ?? "NOK",
    cur: pick(cur[0]),
    prev: pick(prev[0]),
    campaigns: campaigns.map((c) => ({
      name: c.campaign_name,
      spend: Number(c.spend),
      impressions: Number(c.impressions),
      clicks: Number(c.clicks),
    })),
  };
}
