"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Code, Note, Pre } from "@/components/ui";

/**
 * LIFF (LINE Front-end Framework) — ฝั่ง browser ทั้งหมด
 *
 * แนวคิด: หน้าเว็บของเราถูกเปิดใน WebView ของแอป LINE
 * LIFF SDK เป็นสะพานให้เว็บคุยกับแอป LINE ได้ เช่น ถามว่าใครเปิดอยู่
 * หรือสั่งให้ส่งข้อความเข้าห้องแชทที่กำลังเปิด
 *
 * ⚠️ ต้อง import แบบ dynamic เพราะ SDK แตะ window ทันทีที่โหลด
 *    ถ้า import ตรง ๆ จะพังตอน Next.js ทำ server-side render
 */

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type LiffModule = typeof import("@line/liff").default;

export function LiffClient({ liffId }: { liffId: string }) {
  const [liff, setLiff] = useState<LiffModule | null>(null);
  const [status, setStatus] = useState(
    liffId ? "กำลังเริ่มต้น…" : "ยังไม่ได้ตั้ง NEXT_PUBLIC_LIFF_ID",
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [output, setOutput] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!liffId) return;

    let cancelled = false;

    (async () => {
      try {
        // โหลด SDK เฉพาะฝั่ง browser
        const sdk = (await import("@line/liff")).default;
        await sdk.init({ liffId });
        if (cancelled) return;

        setLiff(sdk);
        setStatus("init สำเร็จ");

        // สรุปสภาพแวดล้อมที่กำลังรันอยู่
        setInfo({
          // true เมื่อเปิดจาก "ในแอป LINE", false เมื่อเปิดจาก browser ปกติ
          isInClient: sdk.isInClient(),
          isLoggedIn: sdk.isLoggedIn(),
          os: sdk.getOS(), // ios | android | web
          language: sdk.getLanguage(),
          version: sdk.getVersion(),
          lineVersion: sdk.getLineVersion(),
          // "utou" = แชทเดี่ยว, "group", "room", หรือ null เมื่อเปิดนอกแชท
          context: sdk.getContext()?.type ?? null,
        });

        // ถ้ายังไม่ล็อกอิน (เปิดจาก browser ธรรมดา) ต้องเรียก liff.login() ก่อน
        if (!sdk.isLoggedIn()) {
          setStatus("ยังไม่ได้ล็อกอิน — กดปุ่ม “login()” ด้านล่าง");
          return;
        }

        const p = await sdk.getProfile();
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liffId]);

  const run = async (name: string, fn: () => unknown | Promise<unknown>) => {
    setError(null);
    setOutput(null);
    try {
      const value = await fn();
      setOutput({ action: name, result: value ?? "สำเร็จ" });
    } catch (err) {
      setError(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const inClient = Boolean(info?.isInClient);

  return (
    <div className="space-y-4">
      <Card
        title="สถานะ LIFF"
        action={<Badge ok={liff !== null && !error}>{error ? "ผิดพลาด" : status}</Badge>}
      >
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}
        {info ? <Pre>{JSON.stringify(info, null, 2)}</Pre> : <p className="text-sm text-muted">{status}</p>}
        {info && !inClient && (
          <div className="mt-3">
            <Note tone="warn">
              ตอนนี้เปิดจาก browser ธรรมดา (<Code>isInClient: false</Code>) —
              ฟังก์ชันที่ต้องคุยกับแอป LINE เช่น <Code>sendMessages</Code>,{" "}
              <Code>scanCodeV2</Code>, <Code>closeWindow</Code> จะใช้ไม่ได้
              ต้องเปิดผ่าน LIFF URL ในแอป LINE
            </Note>
          </div>
        )}
      </Card>

      {profile && (
        <Card title="โปรไฟล์จาก liff.getProfile()">
          <div className="flex items-center gap-4">
            {profile.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- รูปจาก CDN ของ LINE
              <img
                src={profile.pictureUrl}
                alt=""
                className="h-14 w-14 rounded-full border border-edge object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{profile.displayName}</p>
              <p className="truncate font-mono text-xs text-muted">{profile.userId}</p>
              {profile.statusMessage && <p className="text-sm text-muted">{profile.statusMessage}</p>}
            </div>
          </div>
        </Card>
      )}

      <Card title="ลองเรียกฟังก์ชันของ LIFF" subtitle="กดปุ่มแล้วดูผลด้านล่าง">
        <div className="flex flex-wrap gap-2">
          <Button disabled={!liff} onClick={() => run("login", () => liff!.login())}>
            login()
          </Button>

          <Button
            disabled={!liff || !inClient}
            onClick={() =>
              run("sendMessages", () =>
                liff!.sendMessages([
                  { type: "text", text: "ข้อความนี้ส่งจากหน้า LIFF ผ่าน liff.sendMessages()" },
                ]),
              )
            }
          >
            sendMessages() — ส่งเข้าห้องแชทที่เปิดอยู่
          </Button>

          <Button
            disabled={!liff}
            onClick={() =>
              run("shareTargetPicker", () =>
                liff!.shareTargetPicker([
                  {
                    type: "text",
                    text: "ลองใช้ LINE API กัน! https://developers.line.biz/",
                  },
                ]),
              )
            }
          >
            shareTargetPicker() — เลือกเพื่อนเพื่อแชร์
          </Button>

          <Button disabled={!liff || !inClient} onClick={() => run("scanCodeV2", () => liff!.scanCodeV2())}>
            scanCodeV2() — สแกน QR
          </Button>

          <Button
            disabled={!liff}
            onClick={() =>
              run("openWindow", () =>
                liff!.openWindow({ url: "https://developers.line.biz/", external: true }),
              )
            }
          >
            openWindow() — เปิดลิงก์ภายนอก
          </Button>

          <Button
            disabled={!liff}
            onClick={() => run("getIDToken → ตรวจที่ server", async () => {
              const idToken = liff!.getIDToken();
              if (!idToken) throw new Error("ไม่มี id_token (ต้องขอ scope openid)");
              const res = await fetch("/api/liff/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });
              return res.json();
            })}
          >
            ส่ง id_token ให้ server ตรวจ
          </Button>

          <Button disabled={!liff || !inClient} onClick={() => run("closeWindow", () => liff!.closeWindow())}>
            closeWindow() — ปิดหน้าต่าง
          </Button>

          <Button
            disabled={!liff}
            onClick={() => run("logout", () => {
              liff!.logout();
              location.reload();
            })}
          >
            logout()
          </Button>
        </div>

        {output !== null && (
          <div className="mt-4">
            <Pre>{JSON.stringify(output, null, 2)}</Pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-edge px-3 py-2 text-sm hover:bg-edge/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
