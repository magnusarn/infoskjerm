import { timingSafeEqual } from "node:crypto";
import type { Screen } from "./types";

/**
 * Tilgang til private skjermer (f.eks. «Tall og trender»):
 * 1. Riktig nøkkel: ?key=<SCREEN_KEY>. Er SCREEN_KEY ikke satt (lokalt), slippes alt gjennom
 *    og skjermen viser et rødt «ikke beskyttet»-merke.
 * 2. Valgfri IP-sperre: er ALLOWED_IPS satt (kommaseparert, f.eks. "84.208.1.2, 193.69.0.0/24"),
 *    må forespørselen i tillegg komme fra en av disse adressene.
 */
export function hasAccess(screen: Screen, key: string | null | undefined, ip?: string | null) {
  if (!screen.private) return true;
  return keyOk(key) && ipOk(ip);
}

function keyOk(key: string | null | undefined) {
  const secret = process.env.SCREEN_KEY;
  if (!secret) return true;
  if (!key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function ipOk(ip: string | null | undefined) {
  const list = (process.env.ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return true;
  if (!ip) return false;
  return list.some((rule) => (rule.includes("/") ? inCidr(ip, rule) : ip === rule));
}

/** IPv4-område, f.eks. 193.69.0.0/24 */
function inCidr(ip: string, cidr: string) {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const toInt = (s: string) => {
    const p = s.split(".").map(Number);
    return p.length === 4 && p.every((n) => n >= 0 && n <= 255) ? ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0 : null;
  };
  const a = toInt(ip);
  const b = toInt(base);
  if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

/** Klientens IP bak Vercel (første adresse i x-forwarded-for) */
export function clientIp(h: { get(name: string): string | null }) {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function isProtected() {
  return Boolean(process.env.SCREEN_KEY);
}
