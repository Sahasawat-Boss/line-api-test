import { Sender } from "./sender";

export const metadata = { title: "ส่งข้อความ · LINE API Playground" };

export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ทดลองส่งข้อความ</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          ส่งข้อความออกจากฝั่งเราโดยไม่ต้องรอให้ผู้ใช้ทักมาก่อน
          เลือกชนิดข้อความจาก dropdown แล้วดู JSON ที่ถูกสร้างขึ้นจริงด้านล่าง
          — โค้ดที่สร้าง JSON เหล่านี้อยู่ที่ <code>src/lib/messages.ts</code>
        </p>
      </div>
      <Sender />
    </div>
  );
}
