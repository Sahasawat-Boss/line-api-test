/**
 * LINE Messaging API client
 *
 * @line/bot-sdk แยก client เป็น 2 ตัว:
 *   - MessagingApiClient      → ยิงไป https://api.line.me   (ส่งข้อความ, profile, rich menu ฯลฯ)
 *   - MessagingApiBlobClient  → ยิงไป https://api-data.line.me (ไฟล์: รูป/เสียง/วิดีโอ, อัปโหลดรูป rich menu)
 *
 * ทั้งคู่ใช้ "Channel access token" ของ Messaging API channel เป็น Bearer token
 * เบื้องหลังก็คือ HTTP request ธรรมดา — ดูตัวอย่างเรียกด้วย fetch ล้วนได้ที่ท้ายไฟล์นี้
 */
import { messagingApi, validateSignature } from "@line/bot-sdk";
import { requireEnv } from "./env";

/** client สำหรับ API ทั่วไป (สร้างใหม่ทุกครั้งเพื่อให้เห็น error ตอน env หายไป) */
export function lineClient() {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: requireEnv("channelAccessToken"),
  });
}

/** client สำหรับงานที่เป็นไฟล์ (binary) */
export function lineBlobClient() {
  return new messagingApi.MessagingApiBlobClient({
    channelAccessToken: requireEnv("channelAccessToken"),
  });
}

/**
 * ตรวจลายเซ็น webhook
 *
 * LINE จะส่ง header `x-line-signature` มาด้วยทุกครั้ง ค่าคือ
 *   Base64( HMAC-SHA256( channelSecret, rawRequestBody ) )
 * ถ้าไม่ตรวจ ใครก็ได้ที่รู้ URL ของเราสามารถยิง event ปลอมเข้ามาได้
 *
 * ข้อควรระวัง: ต้องใช้ raw body (string ดิบ) เท่านั้น — ถ้า JSON.parse แล้ว
 * stringify กลับ ลำดับ/ช่องว่างอาจเปลี่ยน ทำให้ลายเซ็นไม่ตรง
 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  return validateSignature(rawBody, requireEnv("channelSecret"), signature);
}

/**
 * ตัวอย่าง: เรียก Messaging API ด้วย fetch ล้วน ๆ ไม่ใช้ SDK
 * (ไม่ได้ถูกใช้ในแอป มีไว้ให้เห็นว่าเบื้องหลัง SDK คืออะไร)
 *
 * curl เทียบเท่า:
 *   curl -X POST https://api.line.me/v2/bot/message/push \
 *     -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":"U...","messages":[{"type":"text","text":"hello"}]}'
 */
export async function pushMessageWithFetch(to: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("channelAccessToken")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });

  if (!res.ok) {
    // LINE ตอบ error เป็น JSON: { message: "...", details: [...] }
    throw new Error(`LINE API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** แปลง error จาก SDK/fetch ให้เป็นข้อความอ่านง่ายสำหรับแสดงบนหน้าเว็บ */
export function describeLineError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
