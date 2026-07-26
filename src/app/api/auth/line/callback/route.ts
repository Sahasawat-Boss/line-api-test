/**
 * ขั้นที่ 3–5 ของ LINE Login — LINE ส่งผู้ใช้กลับมาที่นี่พร้อม authorization code
 *
 * URL ของไฟล์นี้ต้องเอาไปใส่ในคอนโซล:
 *   LINE Login channel > แท็บ "LINE Login" > Callback URL
 *   ตัวอย่าง: http://localhost:3000/api/auth/line/callback
 *             https://xxxx.ngrok-free.app/api/auth/line/callback
 *   (ใส่ได้หลายอันบรรทัดละ 1 URL)
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { env, requireEnv } from "@/lib/env";
import { createSession, readAndClearTempCookie } from "@/lib/session";

export const runtime = "nodejs";

/** payload ของ id_token ตามสเปก OpenID Connect ที่ LINE ส่งมา */
type LineIdToken = {
  iss: string; // "https://access.line.me"
  sub: string; // ← userId ของผู้ใช้
  aud: string; // channel id ของเรา
  exp: number;
  iat: number;
  nonce?: string;
  name?: string;
  picture?: string;
  email?: string;
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // ผู้ใช้กด "ยกเลิก" ที่หน้ายินยอม
  if (error) {
    const description = url.searchParams.get("error_description") ?? error;
    return redirectWithError(`ล็อกอินไม่สำเร็จ: ${description}`);
  }

  // ---- ตรวจ state กัน CSRF ------------------------------------------------
  const savedState = await readAndClearTempCookie("line_login_state");
  const savedNonce = await readAndClearTempCookie("line_login_nonce");

  if (!code || !state || state !== savedState) {
    return redirectWithError("state ไม่ตรงกัน — อาจถูกปลอม request หรือ cookie หมดอายุ ลองล็อกอินใหม่");
  }

  try {
    // ---- ขั้นที่ 4: เอา code ไปแลก token -----------------------------------
    // endpoint นี้ต้องเรียกจาก "ฝั่ง server" เท่านั้น เพราะต้องใช้ channel secret
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${env.appBaseUrl}/api/auth/line/callback`,
        client_id: requireEnv("loginChannelId"),
        client_secret: requireEnv("loginChannelSecret"),
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`แลก token ไม่สำเร็จ (${tokenResponse.status}): ${await tokenResponse.text()}`);
    }

    const token = (await tokenResponse.json()) as {
      access_token: string; // ใช้เรียก API ของ LINE ในนามผู้ใช้ (เช่น /v2/profile)
      refresh_token: string; // ใช้ต่ออายุ access_token
      id_token: string; // JWT ที่บรรจุตัวตนผู้ใช้ ← ตัวสำคัญ
      expires_in: number;
      scope: string;
      token_type: "Bearer";
    };

    // ---- ขั้นที่ 5: ตรวจและถอด id_token -----------------------------------
    // LINE เซ็น id_token ด้วย HS256 โดยใช้ "channel secret" เป็นกุญแจ
    // ต้องตรวจ signature + issuer + audience + nonce ทุกครั้ง
    // ห้ามเชื่อ payload โดยไม่ตรวจเด็ดขาด (ใครก็ปลอม JWT ได้ถ้าเราไม่ตรวจ)
    const { payload } = await jwtVerify(
      token.id_token,
      new TextEncoder().encode(requireEnv("loginChannelSecret")),
      {
        issuer: "https://access.line.me",
        audience: requireEnv("loginChannelId"),
      },
    );
    const claims = payload as LineIdToken;

    if (savedNonce && claims.nonce !== savedNonce) {
      throw new Error("nonce ไม่ตรงกัน — id_token อาจถูกนำกลับมาใช้ซ้ำ");
    }

    // ทางเลือก: ดึงโปรไฟล์ล่าสุดด้วย access_token (id_token เก็บข้อมูล ณ ตอนล็อกอิน)
    let displayName = claims.name ?? "ผู้ใช้ LINE";
    let pictureUrl = claims.picture;
    try {
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { displayName: string; pictureUrl?: string };
        displayName = profile.displayName;
        pictureUrl = profile.pictureUrl ?? pictureUrl;
      }
    } catch {
      // ไม่ critical — ใช้ค่าจาก id_token ต่อไป
    }

    // ---- เก็บเป็น session ของแอปเรา ---------------------------------------
    await createSession({
      userId: claims.sub,
      displayName,
      pictureUrl,
      email: claims.email,
    });

    return NextResponse.redirect(`${env.appBaseUrl}/profile`);
  } catch (err) {
    console.error("[login callback]", err);
    return redirectWithError(err instanceof Error ? err.message : String(err));
  }
}

function redirectWithError(message: string) {
  return NextResponse.redirect(`${env.appBaseUrl}/login?error=${encodeURIComponent(message)}`);
}
