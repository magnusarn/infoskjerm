import Link from "next/link";
import { SCREENS } from "@/lib/config";

export default function Home() {
  return (
    <main className="home">
      <h1>Infoskjerm</h1>
      <p>Åpne riktig adresse på hver skjerm i fullskjerm. Legg til <code>?demo=1</code> for eksempeldata.</p>
      <ul>
        {Object.entries(SCREENS).map(([id, s]) => (
          <li key={id}>
            <Link href={`/skjerm/${id}`}>/skjerm/{id}</Link> – {s.name}, {s.slides.length} slides
            {s.private && " (krever ?key=…)"}
          </li>
        ))}
      </ul>
    </main>
  );
}
