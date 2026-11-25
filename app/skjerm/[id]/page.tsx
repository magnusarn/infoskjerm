import { notFound } from "next/navigation";
import { SCREENS } from "@/lib/config";
import { headers } from "next/headers";
import { clientIp, hasAccess, isProtected } from "@/lib/auth";
import type { Slide } from "@/lib/types";
import Player from "@/components/Player";

export const dynamic = "force-dynamic";

/** Fyller inn verdier som ligger i miljøvariabler (URL-er, video-ID-er) */
function resolve(slide: Slide): Slide {
  if (slide.type === "iframe" && slide.urlEnv) return { ...slide, url: slide.url || process.env[slide.urlEnv] };
  if (slide.type === "youtube" && slide.videoIdEnv) {
    const v = process.env[slide.videoIdEnv];
    if (v?.startsWith("PL")) return { ...slide, playlistId: slide.playlistId || v };
    return { ...slide, videoId: slide.videoId || v };
  }
  return slide;
}

export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const screen = SCREENS[id];
  if (!screen) notFound();

  if (!hasAccess(screen, sp.key, clientIp(await headers()))) {
    return (
      <main className="locked">
        <h1>Denne skjermen er låst</h1>
        <p>Mangler gyldig nøkkel, eller skjermen åpnes fra et nettverk som ikke har tilgang.</p>
      </main>
    );
  }

  return (
    <Player
      screenId={id}
      name={screen.name}
      slides={screen.slides.map(resolve)}
      query={{ key: sp.key, demo: sp.demo }}
      unprotected={screen.private && !isProtected()}
      only={sp.slide !== undefined ? Number(sp.slide) : undefined}
    />
  );
}
