/**
 * ขั้นที่ 1 ของ LINE Login — พาผู้ใช้ไปหน้ายินยอมของ LINE
 *
 * LINE Login = OAuth 2.0 + OpenID Connect มาตรฐาน ไม่มีอะไรพิเศษ
 * ลำดับทั้งหมด (Authorization Code Flow):
 *
 *   [1] เว็บเรา  →  redirect ไป access.line.me/oauth2/v2.1/authorize
 *   [2] ผู้ใช้กด "อนุญาต" ที่หน้า LINE
 *   [3] LINE  →  redirect กลับมาที่ redirect_uri ของเรา พร้อม ?code=...&state=...
 *   [4] เว็บเรา (ฝั่ง server) เอา code ไปแลก access_token + id_token
 *   [5] ถอด id_token → ได้ userId / ชื่อ / รูป / อีเมล
 *
 * ไฟล์นี้คือขั้นที่ [1]
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { env, requireEnv } from "@/lib/env";
import { setTempCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const channelId = requireEnv("loginChannelId");

  // state = ค่าสุ่มกัน CSRF — ต้องได้ค่าเดิมกลับมาตอน callback
  const state = randomBytes(16).toString("hex");
  // nonce = ค่าสุ่มกัน replay attack ของ id_token — ต้องตรงกับที่ฝังอยู่ใน id_token
  const nonce = randomBytes(16).toString("hex");

  await setTempCookie("line_login_state", state);
  await setTempCookie("line_login_nonce", nonce);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    // ต้องตรงกับที่ลงทะเบียนไว้ใน Console > LINE Login > Callback URL แบบตรงตัวอักษร
    redirect_uri: `${env.appBaseUrl}/api/auth/line/callback`,
    state,
    nonce,
    /**
     * scope ที่ขอ:
     *   openid   → ได้ id_token (JWT) กลับมาด้วย
     *   profile  → ได้ displayName + pictureUrl
     *   email    → ได้อีเมล (ต้องยื่นขออนุมัติในคอนโซลก่อน ไม่งั้นจะ error)
     * ถ้ายังไม่ได้ขอสิทธิ์ email ให้ลบออกจากบรรทัดล่าง
     */
    scope: "openid profile",
    /**
     * bot_prompt: normal | aggressive
     * ให้แสดงตัวเลือก "เพิ่มเพื่อนบอท" ตอนล็อกอินด้วย
     * ใช้ได้เมื่อผูก LINE Login channel เข้ากับ Messaging API channel แล้ว
     */
    // bot_prompt: "normal",
  });

  const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  return NextResponse.redirect(authorizeUrl);
}
