/**
 * ส่งข้อความออกจากฝั่งเรา (ไม่ต้องรอให้ผู้ใช้ทักมาก่อน)
 *
 * มี 3 แบบ:
 *   push       ส่งหา 1 คน/กลุ่ม        ต้องรู้ userId หรือ groupId
 *   multicast  ส่งหาหลาย userId พร้อมกัน (สูงสุด 500) — ส่งเข้ากลุ่มไม่ได้
 *   broadcast  ส่งหาเพื่อนทุกคนของบัญชี
 *
 * ทั้งสามแบบ "นับโควตา" ต่างจาก reply message ที่ฟรี
 * บัญชี Communication plan แบบฟรีมีโควตาจำกัดต่อเดือน (พิมพ์ "quota" ในแชทเพื่อดู)
 */
import { NextRequest, NextResponse } from "next/server";
import { describeLineError, lineClient } from "@/lib/line";
import { SAMPLES, isSampleKey, textMessage } from "@/lib/messages";

export const runtime = "nodejs";

type SendBody = {
  mode: "push" | "multicast" | "broadcast";
  /** userId หรือ groupId (สำหรับ push) / คั่นด้วย , หรือขึ้นบรรทัดใหม่ (สำหรับ multicast) */
  to?: string;
  /** ถ้าระบุ จะส่งตัวอย่างจากแคตตาล็อกแทน text */
  sample?: string;
  text?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendBody;
    const client = lineClient();

    const messages = body.sample && isSampleKey(body.sample)
      ? [SAMPLES[body.sample].build()]
      : [textMessage(body.text?.trim() || "ข้อความทดสอบจาก playground")];

    switch (body.mode) {
      case "push": {
        const to = body.to?.trim();
        if (!to) {
          return NextResponse.json({ ok: false, error: "ต้องระบุ userId หรือ groupId" }, { status: 400 });
        }
        const result = await client.pushMessage({ to, messages });
        return NextResponse.json({ ok: true, mode: "push", sentMessages: result.sentMessages, messages });
      }

      case "multicast": {
        const to = (body.to ?? "")
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (to.length === 0) {
          return NextResponse.json({ ok: false, error: "ต้องระบุ userId อย่างน้อย 1 คน" }, { status: 400 });
        }
        await client.multicast({ to, messages });
        return NextResponse.json({ ok: true, mode: "multicast", count: to.length, messages });
      }

      case "broadcast": {
        await client.broadcast({ messages });
        return NextResponse.json({ ok: true, mode: "broadcast", messages });
      }

      default:
        return NextResponse.json({ ok: false, error: `mode "${body.mode}" ไม่ถูกต้อง` }, { status: 400 });
    }
  } catch (error) {
    console.error("[send]", error);
    // error ที่เจอบ่อย:
    //   401 Invalid access token   → token ผิด/หมดอายุ
    //   400 Invalid to             → userId ผิดรูปแบบ (ต้องขึ้นต้นด้วย U)
    //   403 no permission          → บัญชียังไม่ได้เปิดสิทธิ์ หรือผู้ใช้บล็อกบอท
    return NextResponse.json({ ok: false, error: describeLineError(error) }, { status: 500 });
  }
}
