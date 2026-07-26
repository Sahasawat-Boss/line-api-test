"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Pre } from "@/components/ui";
import type { LoggedEvent } from "@/lib/event-log";

/**
 * แสดง webhook event ที่เข้ามาแบบเกือบ real-time ด้วยการ poll ทุก 2 วินาที
 * (ของจริงจะใช้ WebSocket / SSE ก็ได้ แต่ poll เข้าใจง่ายกว่าสำหรับการเรียนรู้)
 */
export function LogViewer() {
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/line/events", { cache: "no-store" });
        const data = (await res.json()) as { events: LoggedEvent[] };
        if (!cancelled) setEvents(data.events);
      } catch {
        // เงียบไว้ — อาจแค่ dev server กำลัง reload
      }
    };

    void load();
    if (!live) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, reloadKey]);

  const clear = async () => {
    await fetch("/api/line/events", { method: "DELETE" });
    setReloadKey((n) => n + 1);
  };

  return (
    <Card
      title={`event ล่าสุด (${events.length})`}
      subtitle="ทักบอทในแอป LINE แล้วรายการจะโผล่ขึ้นมาที่นี่ภายใน 2 วินาที"
      action={
        <div className="flex items-center gap-2">
          <Badge ok={live}>{live ? "กำลังฟัง" : "หยุด"}</Badge>
          <button
            onClick={() => setLive((v) => !v)}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs hover:bg-edge/40"
          >
            {live ? "หยุด" : "เริ่ม"}
          </button>
          <button
            onClick={clear}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs hover:bg-edge/40"
          >
            ล้าง
          </button>
        </div>
      }
    >
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          ยังไม่มี event — ลองพิมพ์อะไรก็ได้ในห้องแชทกับบอท
        </p>
      ) : (
        <ul className="divide-y divide-edge">
          {events.map((event) => (
            <li key={event.id} className="py-2.5">
              <button
                onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span className="mt-0.5 shrink-0 rounded bg-line/15 px-2 py-0.5 font-mono text-xs text-line">
                  {event.type}
                </span>
                <span className="flex-1 text-sm">{event.summary}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {new Date(event.receivedAt).toLocaleTimeString("th-TH")}
                </span>
              </button>
              {expanded === event.id && (
                <div className="mt-2">
                  <Pre>{JSON.stringify(event.raw, null, 2)}</Pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
