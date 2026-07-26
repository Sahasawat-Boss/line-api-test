/**
 * ตรวจสอบ token ที่ได้จาก LIFF ฝั่ง client
 *
 * ⚠️ บทเรียนสำคัญด้านความปลอดภัย
 * ฝั่ง browser เรียก liff.getProfile() แล้วได้ userId มา — "ห้าม" ส่ง userId นั้น
 * มาให้ server แล้วเชื่อเลย เพราะใครก็แก้ค่าใน devtools แล้วสวมรอยเป็นคนอื่นได้
 *
 * วิธีที่ถูกคือ ฝั่ง client ส่ง token มา แล้วให้ server ถาม LINE ว่า token นี้จริงไหม
 * เป็นของใคร:
 *   - liff.getIDToken()     → JWT → ตรวจที่ POST /oauth2/v2.1/verify (ได้ sub = userId)
 *   - liff.getAccessToken() → opaque → ตรวจที่ GET /oauth2/v2.1/verify (ได้แค่ว่า valid + client_id)
 *
 * ที่นี่ใช้แบบ id_token เพราะได้ตัวตนผู้ใช้กลับมาด้วยเลย
 */
import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ ok: false, error: "ไม่ได้ส่ง idToken มา" }, { status: 400 });
    }

    // ให้ LINE เป็นคนตรวจ signature/หมดอายุให้ (จะตรวจเองด้วย jose ก็ได้ เหมือนใน login callback)
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        // client_id ของ LIFF คือ channel id ของ LINE Login channel ที่ LIFF อยู่ใต้มัน
        client_id: requireEnv("loginChannelId"),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data }, { status: res.status });
    }

    // data.sub คือ userId ที่ "เชื่อถือได้" — ตัวนี้แหละที่เอาไปใช้อ้างอิงในฐานข้อมูล
    return NextResponse.json({
      ok: true,
      verifiedUserId: data.sub,
      claims: data,
      note: "userId นี้ผ่านการยืนยันจาก LINE แล้ว ใช้อ้างอิงในฐานข้อมูลได้อย่างปลอดภัย",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
