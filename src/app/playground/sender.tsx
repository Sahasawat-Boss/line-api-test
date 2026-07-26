"use client";

import { useState } from "react";
import { Card, Note, Pre } from "@/components/ui";
import { SAMPLES, SAMPLE_KEYS, type SampleKey } from "@/lib/messages";

type Mode = "push" | "multicast" | "broadcast";

/**
 * ฟอร์มทดลองส่งข้อความ
 * ทุกอย่างยิงไปที่ /api/line/send ฝั่ง server — token ไม่เคยหลุดมาถึง browser
 */
export function Sender() {
  const [mode, setMode] = useState<Mode>("push");
  const [to, setTo] = useState("");
  const [text, setText] = useState("สวัสดีจาก playground 👋");
  const [sample, setSample] = useState<SampleKey | "">("");
  const [result, setResult] = useState<unknown>(null);
  const [sending, setSending] = useState(false);

  const preview = sample ? SAMPLES[sample].build() : { type: "text", text };

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, to, text, sample: sample || undefined }),
      });
      setResult(await res.json());
    } catch (error) {
      setResult({ ok: false, error: String(error) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="ส่งข้อความ" subtitle="POST /api/line/send → LINE Messaging API">
        <div className="space-y-4">
          {/* เลือกวิธีส่ง */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">วิธีส่ง</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["push", "push — ส่งหา 1 คน/กลุ่ม"],
                  ["multicast", "multicast — หลาย userId (≤500)"],
                  ["broadcast", "broadcast — เพื่อนทุกคน"],
                ] as [Mode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    mode === value
                      ? "border-line bg-line/10 text-line"
                      : "border-edge hover:bg-edge/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ผู้รับ */}
          {mode !== "broadcast" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {mode === "push" ? "userId หรือ groupId" : "userId หลายอัน (คั่นด้วย , หรือขึ้นบรรทัดใหม่)"}
              </label>
              <textarea
                value={to}
                onChange={(e) => setTo(e.target.value)}
                rows={mode === "push" ? 1 : 3}
                placeholder="U1234567890abcdef..."
                className="w-full rounded-lg border border-edge bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-line"
              />
              <p className="mt-1 text-xs text-muted">
                หา userId ของตัวเองได้โดยพิมพ์ <code>id</code> ในห้องแชทกับบอท
              </p>
            </div>
          )}

          {/* เนื้อหา */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">เนื้อหา</label>
            <select
              value={sample}
              onChange={(e) => setSample(e.target.value as SampleKey | "")}
              className="mb-2 w-full rounded-lg border border-edge bg-card px-3 py-2 text-sm outline-none focus:border-line"
            >
              <option value="">ข้อความที่พิมพ์เอง</option>
              {SAMPLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SAMPLES[key].label} — {SAMPLES[key].description}
                </option>
              ))}
            </select>
            {!sample && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-line"
              />
            )}
          </div>

          <button
            onClick={send}
            disabled={sending}
            className="rounded-lg bg-line px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? "กำลังส่ง…" : "ส่ง"}
          </button>
        </div>
      </Card>

      <Card title="JSON ที่จะถูกส่งไป LINE" subtitle="นี่คือหน้าตาจริงของ message object">
        <Pre>{JSON.stringify(preview, null, 2)}</Pre>
      </Card>

      {result !== null && (
        <Card title="ผลลัพธ์จาก API">
          <Pre>{JSON.stringify(result, null, 2)}</Pre>
        </Card>
      )}

      <Note tone="warn">
        push / multicast / broadcast <strong>นับโควตา</strong> ของบัญชี ต่างจาก reply ที่ฟรี —
        พิมพ์ <code>quota</code> ในแชทเพื่อดูว่าเหลือเท่าไร
      </Note>
    </div>
  );
}
