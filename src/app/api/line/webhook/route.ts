/**
 * Webhook endpoint — ประตูทางเข้าของทุก event จาก LINE
 *
 * URL นี้คือค่าที่ต้องเอาไปใส่ใน LINE Developers Console:
 *   Messaging API channel > แท็บ Messaging API > Webhook URL
 *   ตัวอย่าง: https://xxxx.ngrok-free.app/api/line/webhook
 *
 * สิ่งที่ต้องทำในทุก webhook (ไม่ว่าจะภาษาอะไร framework ไหน):
 *   1. อ่าน "raw body" เป็น string ก่อน parse   ← จำเป็นสำหรับตรวจลายเซ็น
 *   2. ตรวจ header x-line-signature
 *   3. ตอบ HTTP 200 ให้เร็วที่สุด
 *   4. งานหนักค่อยทำต่อ (LINE รอไม่นาน ถ้าช้าจะถือว่า fail แล้ว retry)
 */
import { NextRequest, NextResponse } from "next/server";
import type { webhook } from "@line/bot-sdk";
import { verifyLineSignature } from "@/lib/line";
import { handleEvent } from "@/lib/bot";
import { logEvent } from "@/lib/event-log";

// บังคับให้รันบน Node.js runtime — SDK ใช้ node:crypto และ node:stream
export const runtime = "nodejs";
// อย่า cache — ทุก request ต้องประมวลผลจริง
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // (1) raw body — ห้าม request.json() ก่อน ไม่งั้นลายเซ็นจะตรวจไม่ผ่าน
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  // (2) ตรวจลายเซ็น
  try {
    if (!verifyLineSignature(rawBody, signature)) {
      console.warn("[webhook] ลายเซ็นไม่ถูกต้อง — ปฏิเสธ request");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } catch (error) {
    // เกิดตอนยังไม่ได้ตั้ง LINE_CHANNEL_SECRET
    console.error("[webhook]", error);
    return new NextResponse("Server not configured", { status: 500 });
  }

  const body = JSON.parse(rawBody) as { destination?: string; events: webhook.Event[] };

  // กด "Verify" ในคอนโซล LINE จะส่ง events: [] มา ต้องตอบ 200 ให้ได้
  if (!body.events?.length) {
    return NextResponse.json({ ok: true, note: "ไม่มี event (น่าจะเป็นการกด Verify)" });
  }

  // (3) + (4) ประมวลผลทีละ event
  // ที่นี่ await ให้เสร็จก่อนตอบ 200 เพราะเป็นโปรเจกต์เรียนรู้ อยากให้ error เห็นชัด
  // ของจริงถ้างานหนัก ควร enqueue เข้าคิวแล้วตอบ 200 ทันที
  await Promise.all(
    body.events.map(async (event) => {
      try {
        await handleEvent(event);
      } catch (error) {
        // จับ error ไว้ที่นี่ ไม่ปล่อยให้ทั้ง request พัง
        // เพราะถ้าเราตอบ 5xx LINE จะ retry ส่ง event เดิมซ้ำ
        console.error("[webhook] handleEvent ล้มเหลว:", error);
        logEvent({
          type: `${event.type} (error)`,
          summary: error instanceof Error ? error.message : String(error),
          raw: event,
        });
      }
    }),
  );

  return NextResponse.json({ ok: true });
}

/**
 * GET ไม่ใช่ส่วนหนึ่งของ LINE webhook — ใส่ไว้ให้เปิดใน browser
 * แล้วเช็คได้ว่า route deploy ขึ้นแล้วจริง
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint พร้อมใช้งาน — LINE จะเรียกด้วย POST เท่านั้น",
    hint: "เอา URL นี้ไปใส่ใน LINE Developers Console > Messaging API > Webhook URL",
  });
}
