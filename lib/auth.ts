import type { Screen } from "./types";

/**
 * Private skjermer krever ?key=<SCREEN_KEY>.
 * Er SCREEN_KEY ikke satt (f.eks. lokalt), slippes alt gjennom,
 * og skjermen viser et rødt «ikke beskyttet»-merke.
 */
export function hasAccess(screen: Screen, key: string | null | undefined) {
  if (!screen.private) return true;
  const secret = process.env.SCREEN_KEY;
  if (!secret) return true;
  return key === secret;
}

export function isProtected() {
  return Boolean(process.env.SCREEN_KEY);
}
