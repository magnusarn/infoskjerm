import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Viser hvilken IP-adresse forespørselen kommer fra – brukes til å sette ALLOWED_IPS */
export function GET(req: NextRequest) {
  return NextResponse.json({ ip: clientIp(req.headers) }, { headers: { "Cache-Control": "no-store" } });
}
