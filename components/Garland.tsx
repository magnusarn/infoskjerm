"use client";

import { useEffect, useState } from "react";

/**
 * Julelysslynge langs toppen av skjermen, i KAR-farger.
 *
 * Slyngen er bygd av like buer (SWAG px brede) som starter og slutter i skjermkanten,
 * så to TV-er som henger side om side ser ut som én sammenhengende slynge.
 * `fasten` sier hvor slyngen er festet med en granbar: "left", "right" eller "both".
 * Kanten uten granbar er «åpen» og fortsetter på nabo-TV-en.
 *
 * Vises bare i julesesongen (20. november – 1. januar).
 */
export type Fasten = "left" | "right" | "both";

const W = 1920;
const SWAG = 240; // 8 buer over skjermen
const Y0 = 6; // festepunkt
const SAG = 16; // hvor dypt buen henger
const COLORS = ["#f3d9a4", "#d0685a", "#a9d0d4", "#fff4e0"]; // gull, rød, blågrønn, varmhvit

export function isChristmasSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return (m === 11 && day >= 20) || m === 12 || (m === 1 && day <= 1);
}

/** Punkt på bue nr. i ved t (0–1): kvadratisk Bézier fra (x0,Y0) via (x0+SWAG/2, Y0+2·SAG) til (x0+SWAG,Y0) */
function at(i: number, t: number) {
  const x = i * SWAG + t * SWAG;
  const y = Y0 + 2 * SAG * 2 * t * (1 - t);
  return [x, y] as const;
}

function Sprig({ side }: { side: "left" | "right" }) {
  // Tegnet for venstre hjørne, speilvendt for høyre
  const needles = [];
  for (let k = 0; k < 9; k++) {
    const x = 8 + k * 9;
    const y = 4 + k * 3.2;
    needles.push(
      <path key={`a${k}`} d={`M${x},${y} l${7 - k * 0.3},${-11 + k * 0.4}`} />,
      <path key={`b${k}`} d={`M${x},${y} l${10 - k * 0.4},${8 - k * 0.3}`} />,
    );
  }
  return (
    <g transform={side === "right" ? `translate(${W},0) scale(-1,1)` : undefined}>
      <g stroke="#55705f" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M0,2 Q40,10 92,32" stroke="#6b5a3e" strokeWidth="3.5" />
        {needles}
      </g>
      <g stroke="#3f5a4c" strokeWidth="2.5" strokeLinecap="round" fill="none" transform="translate(6,10)">
        {needles}
      </g>
      {/* Sløyfe og to bær */}
      <circle cx="26" cy="22" r="6.5" fill="#a8483d" />
      <circle cx="36" cy="27" r="5.5" fill="#bd9a5f" />
      <circle cx="24" cy="20" r="2" fill="#fef9f3" opacity="0.5" />
      <circle cx="34.5" cy="25.5" r="1.6" fill="#fef9f3" opacity="0.5" />
    </g>
  );
}

export default function Garland({ fasten, offset = 0 }: { fasten: Fasten; offset?: number }) {
  // Sjekkes i nettleseren, så den dukker opp og forsvinner av seg selv (skjermene lastes på nytt hver 6. time)
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isChristmasSeason()), []);
  if (!on) return null;

  const swags = W / SWAG;
  const wire = Array.from({ length: swags }, (_, i) => {
    const x0 = i * SWAG;
    return `${i ? "" : `M${x0},${Y0} `}Q${x0 + SWAG / 2},${Y0 + 2 * SAG} ${x0 + SWAG},${Y0}`;
  }).join(" ");

  const bulbs: { x: number; y: number; n: number }[] = [];
  for (let i = 0; i < swags; i++) {
    for (const t of [0.2, 0.5, 0.8]) {
      const [x, y] = at(i, t);
      bulbs.push({ x, y, n: bulbs.length + offset });
    }
  }

  return (
    <svg className="garland" viewBox={`0 0 ${W} 60`} width={W} height={60} aria-hidden>
      <defs>
        {COLORS.map((c, i) => (
          <radialGradient key={i} id={`glow${i}`}>
            <stop offset="0%" stopColor={c} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <path d={wire} fill="none" stroke="#5a4a35" strokeWidth="2" />
      {bulbs.map(({ x, y, n }) => {
        const c = n % COLORS.length;
        // Ulik takt og forsinkelse gir rolig, tilfeldig glimt
        const dur = 3 + ((n * 7) % 5) * 0.6;
        const delay = -((n * 13) % 11) * 0.45;
        return (
          <g key={n} transform={`translate(${x},${y})`}>
            <rect x="-3" y="0" width="6" height="5" rx="1" fill="#8c7350" />
            <g className="bulb" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
              <circle cx="0" cy="12" r="16" fill={`url(#glow${c})`} />
              <ellipse cx="0" cy="12" rx="4.5" ry="7" fill={COLORS[c]} />
            </g>
          </g>
        );
      })}
      {(fasten === "left" || fasten === "both") && <Sprig side="left" />}
      {(fasten === "right" || fasten === "both") && <Sprig side="right" />}
    </svg>
  );
}
