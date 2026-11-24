"use client";

import { useEffect, useState } from "react";

const TZ = "Europe/Oslo";

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="clock" />;
  const date = now.toLocaleDateString("nb-NO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  return (
    <div className="clock">
      <span className="date">{date}</span>
      <span className="time">{time}</span>
    </div>
  );
}
