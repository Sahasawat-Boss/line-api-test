"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Pre } from "@/components/ui";

/**
 * ดึงสถานะบอทมาแสดง — เป็นตัวอย่างว่า client component เรียก route handler ของเราเอง
 * (ไม่เรียก LINE ตรง ๆ จาก browser เพราะ channel access token ต้องอยู่ฝั่ง server เท่านั้น)
 */
export function BotStatus() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  // เพิ่มค่านี้ทีละ 1 เมื่อกดปุ่มรีเฟรช เพื่อสั่งให้ effect ทำงานใหม่
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/line/bot-info", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (error) {
        if (!cancelled) setData({ ok: false, error: String(error) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const ok = (data as { ok?: boolean } | null)?.ok;

  return (
    <Card
      title="สถานะบอท"
      subtitle="เรียก getBotInfo / getWebhookEndpoint / getMessageQuota พร้อมกัน"
      action={
        <div className="flex items-center gap-2">
          {!loading && <Badge ok={ok}>{ok ? "เชื่อมต่อได้" : "มีปัญหา"}</Badge>}
          <button
            onClick={() => {
              setLoading(true);
              setReloadKey((n) => n + 1);
            }}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs hover:bg-edge/40"
          >
            รีเฟรช
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted">กำลังโหลด…</p>
      ) : (
        <Pre>{JSON.stringify(data, null, 2)}</Pre>
      )}
    </Card>
  );
}

/** ปุ่มควบคุม Rich Menu — เรียก /api/line/richmenu ด้วย method ต่าง ๆ */
export function RichMenuControls() {
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (method: "GET" | "POST" | "DELETE") => {
    setBusy(method);
    try {
      const res = await fetch("/api/line/richmenu", { method });
      setResult(await res.json());
    } catch (error) {
      setResult({ ok: false, error: String(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="Rich Menu"
      subtitle="เมนูรูปภาพด้านล่างห้องแชท — สร้างโครง → อัปโหลดรูป → ตั้งเป็น default"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => call("POST")}
          disabled={busy !== null}
          className="rounded-lg bg-line px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "POST" ? "กำลังสร้าง…" : "สร้าง + ตั้งเป็น default"}
        </button>
        <button
          onClick={() => call("GET")}
          disabled={busy !== null}
          className="rounded-lg border border-edge px-3 py-2 text-sm disabled:opacity-50"
        >
          ดูรายการที่มีอยู่
        </button>
        <button
          onClick={() => call("DELETE")}
          disabled={busy !== null}
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-500 disabled:opacity-50"
        >
          ลบทั้งหมด
        </button>
      </div>
      <p className="mb-3 text-xs text-muted">
        หลังสร้างเสร็จ ให้ปิดแล้วเปิดห้องแชทกับบอทใหม่ในแอป LINE เมนูถึงจะโผล่ (รูปเมนูถูกวาดด้วยโค้ดที่{" "}
        <code>src/lib/richmenu.tsx</code>)
      </p>
      {result !== null && <Pre>{JSON.stringify(result, null, 2)}</Pre>}
    </Card>
  );
}
