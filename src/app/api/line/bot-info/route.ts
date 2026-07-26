/**
 * รวมข้อมูลสถานะบอทไว้ที่เดียว ใช้แสดงบนหน้า /messaging
 * เป็นตัวอย่างการเรียก API ที่เป็น "อ่านอย่างเดียว" ของ Messaging API
 */
import { NextResponse } from "next/server";
import { describeLineError, lineClient } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = lineClient();

    // ยิงพร้อมกันทั้งหมด แต่ใช้ allSettled เพื่อให้ตัวที่พังไม่ทำให้ตัวอื่นพังไปด้วย
    const [info, webhookEndpoint, quota, consumption] = await Promise.allSettled([
      client.getBotInfo(), // ชื่อบอท, basicId, chatMode
      client.getWebhookEndpoint(), // URL ที่ตั้งไว้ในคอนโซล + active หรือไม่
      client.getMessageQuota(), // โควตาข้อความของเดือนนี้
      client.getMessageQuotaConsumption(), // ใช้ไปแล้วเท่าไร
    ]);

    const value = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
    const failure = (r: PromiseSettledResult<unknown>) =>
      r.status === "rejected" ? describeLineError(r.reason) : null;

    return NextResponse.json({
      ok: true,
      botInfo: value(info),
      webhookEndpoint: value(webhookEndpoint),
      quota: value(quota),
      consumption: value(consumption),
      errors: [failure(info), failure(webhookEndpoint), failure(quota), failure(consumption)].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: describeLineError(error) }, { status: 500 });
  }
}
