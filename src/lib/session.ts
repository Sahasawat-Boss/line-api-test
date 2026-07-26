/**
 * Session ของ "แอปเรา" (ไม่ใช่ของ LINE)
 *
 * หลังผู้ใช้ล็อกอินด้วย LINE สำเร็จ เราจะออก JWT ของเราเองแล้วเก็บใน cookie
 * แบบ httpOnly เพื่อจำว่าใครเป็นใคร — LINE ไม่ได้จัดการ session ให้เรา
 * มันแค่ยืนยันตัวตนให้ครั้งเดียวตอนล็อกอินเท่านั้น
 *
 * ทำไมต้องเซ็น JWT แทนที่จะเก็บ userId เปล่า ๆ ใน cookie?
 *   เพราะ cookie แก้ได้จากฝั่ง client — ถ้าไม่เซ็น ใครก็ปลอมเป็นคนอื่นได้
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "./env";

const COOKIE_NAME = "line_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 วัน

export type SessionUser = {
  userId: string; // LINE userId (ขึ้นต้นด้วย U) — คงที่ต่อ 1 channel
  displayName: string;
  pictureUrl?: string;
  email?: string; // ได้เฉพาะเมื่อขอ scope "email" และ channel ได้รับอนุมัติแล้ว
};

function secretKey() {
  return new TextEncoder().encode(requireEnv("sessionSecret"));
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript ฝั่ง client อ่านไม่ได้ → กัน XSS ขโมย session
    secure: process.env.NODE_ENV === "production", // ส่งผ่าน HTTPS เท่านั้นตอน prod
    sameSite: "lax", // ต้องเป็น lax ไม่ใช่ strict ไม่งั้น cookie จะไม่ติดมาตอน redirect กลับจาก LINE
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.userId),
      displayName: String(payload.displayName),
      pictureUrl: payload.pictureUrl ? String(payload.pictureUrl) : undefined,
      email: payload.email ? String(payload.email) : undefined,
    };
  } catch {
    // token หมดอายุหรือถูกแก้ → ถือว่ายังไม่ล็อกอิน
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

/**
 * cookie ชั่วคราวสำหรับเก็บ state/nonce ระหว่างขั้นตอนล็อกอิน
 * มีอายุแค่ 10 นาที พอให้ผู้ใช้ไปกดยินยอมที่หน้า LINE แล้วกลับมา
 */
export async function setTempCookie(name: string, value: string) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function readAndClearTempCookie(name: string): Promise<string | null> {
  const store = await cookies();
  const value = store.get(name)?.value ?? null;
  store.delete(name);
  return value;
}
