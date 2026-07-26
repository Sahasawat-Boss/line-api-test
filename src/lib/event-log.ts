/**
 * เก็บ log ของ webhook event ไว้ในหน่วยความจำ เพื่อเอาไปแสดงบนหน้า /webhook
 *
 * ⚠️ ของจริงต้องใช้ database — เก็บใน memory แบบนี้จะหายเมื่อ restart
 * และใช้ไม่ได้บน serverless ที่มีหลาย instance (เช่น Vercel) แต่สำหรับเรียนรู้
 * บนเครื่องตัวเองมันเห็นภาพเร็วดี
 *
 * ใช้ globalThis เพราะตอน `next dev` มี hot reload โมดูลจะถูกโหลดใหม่เรื่อย ๆ
 * ถ้าเก็บใน module scope เฉย ๆ log จะหายทุกครั้งที่แก้ไฟล์
 */

export type LoggedEvent = {
  id: string;
  receivedAt: string;
  /** ชนิด event เช่น message, follow, postback */
  type: string;
  /** สรุปสั้น ๆ ให้อ่านง่ายในตาราง */
  summary: string;
  /** payload ดิบจาก LINE ไว้กางดูทีละฟิลด์ */
  raw: unknown;
};

const MAX_EVENTS = 50;

const store = globalThis as unknown as { __lineEventLog?: LoggedEvent[] };
store.__lineEventLog ??= [];

export function logEvent(entry: Omit<LoggedEvent, "id" | "receivedAt">) {
  const events = store.__lineEventLog!;
  events.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    ...entry,
  });
  // เก็บแค่ N รายการล่าสุด กัน memory บวม
  events.length = Math.min(events.length, MAX_EVENTS);
}

export function readEvents(): LoggedEvent[] {
  return [...store.__lineEventLog!];
}

export function clearEvents() {
  store.__lineEventLog!.length = 0;
}
