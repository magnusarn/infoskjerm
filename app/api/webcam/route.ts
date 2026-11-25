import { NextRequest, NextResponse } from "next/server";
import { SCREENS } from "@/lib/config";

/** Henter siste webkamerabilde for en ski-slide (bare URL-er fra oppsettet, aldri vilkårlige adresser) */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const slide = SCREENS[q.get("screen") ?? ""]?.slides[Number(q.get("i"))];
  if (!slide || slide.type !== "ski" || !slide.webcam) return new NextResponse("Ikke funnet", { status: 404 });
  const res = await fetch(slide.webcam.url, { next: { revalidate: 300 } });
  if (!res.ok) return new NextResponse("Webkamera utilgjengelig", { status: 502 });
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=300" },
  });
}
