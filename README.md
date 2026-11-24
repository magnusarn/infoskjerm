# Infoskjerm

Én nettapp, én URL per skjerm. Hver skjerm roterer mellom sine egne slides.

| Skjerm | URL | Innhold |
|---|---|---|
| Kontor 1 | `/skjerm/kontor-1` | Yr, Ruter-avganger, kalender |
| Kontor 2 | `/skjerm/kontor-2?key=…` | GA4, Meta, Power BI (låst med nøkkel) |
| Publikum | `/skjerm/publikum` | YouTube, avganger, Yr, nyheter |

Legg til `?demo=1` for å se alle slides med eksempeldata. `&slide=2` låser visningen til én slide, nyttig når du jobber med oppsettet.

## Endre innhold

Alt oppsett ligger i **`lib/config.ts`**: rekkefølge, varighet (`seconds`), sted for Yr og holdeplass for Ruter.
Finn holdeplass-ID-en (`NSR:StopPlace:xxxx`) på https://stoppested.entur.org.

Når du lagrer en endring på GitHub, deployer Vercel automatisk. Skjermene merker den nye versjonen og laster seg selv på nytt innen ca. 2 minutter.

## Deploy på Vercel (første gang)

1. Gå til https://vercel.com/new og logg inn med GitHub.
2. Velg repoet `infoskjerm` og trykk **Deploy**. Du trenger ingen innstillinger for å starte.
3. Åpne `https://<prosjekt>.vercel.app/skjerm/kontor-1`. Yr og Ruter skal virke med en gang.

## Miljøvariabler (Vercel → Project → Settings → Environment Variables)

Se `.env.example`. Etter at du har endret en variabel: **Deployments → … → Redeploy**.

| Variabel | Trengs for | Hvordan |
|---|---|---|
| `SCREEN_KEY` | Låse kontor-2 | Lang, tilfeldig streng. Skjermen åpnes med `?key=<strengen>` |
| `MET_USER_AGENT` | Yr | F.eks. `infoskjerm/1.0 din@epost.no`. Påkrevd av MET |
| `ENTUR_CLIENT_NAME` | Ruter | F.eks. `dittnavn-infoskjerm`. Påkrevd av Entur |
| `CALENDAR_ICS_URL` | Kalender | Outlook: Innstillinger → Kalender → Delte kalendere → Publiser en kalender → kopier **ICS**-lenken |
| `YOUTUBE_VIDEO_ID` | YouTube | ID-en fra `youtube.com/watch?v=<ID>`, eller en spilleliste-ID (`PL…`) |
| `POWERBI_EMBED_URL` | Power BI | Power BI: Fil → Bygg inn rapport → Publiser på nett. **NB:** lenken blir offentlig |
| `GA4_PROPERTY_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` | GA4 | Se under |
| `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` | Meta | Se under |

### GA4
1. https://console.cloud.google.com: lag et prosjekt og aktiver **Google Analytics Data API**.
2. IAM → Tjenestekontoer → lag en servicekonto → Nøkler → Legg til nøkkel → JSON.
3. GA4 → Admin → Tilgangsadministrasjon for egenskap → legg til servicekontoens e-post med rollen **Leser**.
4. Lim inn property-ID-en (bare tallet) og hele JSON-fila i Vercel.

### Meta
1. https://business.facebook.com → Innstillinger → Systembrukere → lag en systembruker.
2. Gi den tilgang til annonsekontoen.
3. «Generer ny token» med tillatelsen `ads_read`.
4. Lim inn token og annonsekonto-ID (tallene etter `act_`) i Vercel.

## Skjermene

Åpne URL-en i Chrome i kiosk-modus på PC-en eller mini-PC-en ved TV-en:

```
chrome.exe --kiosk --app="https://<prosjekt>.vercel.app/skjerm/kontor-1"
```

Alt er tegnet for 1920×1080 og skaleres til skjermen. Har skjermen ikke nett, vises sist hentede data med et «Frakoblet»-merke.

## Legge til en ny slide-type

1. Legg typen til i `lib/types.ts`.
2. Hvis den trenger data: lag en henter i `lib/sources/` og koble den til i `app/api/data/route.ts`.
3. Lag visningen i `components/slides/` og legg den til i `SlideView` i `components/Player.tsx`.

Ferdige typer som ikke er i bruk ennå: `image` (bilde fra `/public`, f.eks. kampanjeplakater) og `message` (stor velkomsttekst).

## Data og vilkår
- Værdata: MET Norway (CC BY 4.0). Data caches i 30 minutter, som vilkårene krever.
- Kollektivdata: Entur (NLOD).
- Nyheter: RSS fra NRK. Bare overskrifter vises, med kilde.
