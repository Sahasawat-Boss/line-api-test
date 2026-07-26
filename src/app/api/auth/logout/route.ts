/**
 * ออกจากระบบ = ลบ cookie ของ "แอปเรา" เท่านั้น
 *
 * ไม่ได้ออกจาก LINE นะ — ครั้งหน้าที่กดล็อกอิน LINE จะจำได้และไม่ถามยินยอมซ้ำ
 * ถ้าอยากยกเลิก access_token จริง ๆ ต้องเรียก POST https://api.line.me/oauth2/v2.1/revoke
 */
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(`${env.appBaseUrl}/login`, { status: 303 });
}
