import Link from "next/link";
import { Card, Code, Note, Pre } from "@/components/ui";
import { SAMPLES, SAMPLE_KEYS } from "@/lib/messages";
import { env } from "@/lib/env";
import { BotStatus, RichMenuControls } from "./bot-status";

export const dynamic = "force-dynamic";

const EVENTS = [
  ["message", "ผู้ใช้ส่งข้อความ/รูป/สติกเกอร์/ตำแหน่ง", "มี replyToken"],
  ["postback", "ผู้ใช้กดปุ่มที่มี action เป็น postback", "มี replyToken"],
  ["follow", "ผู้ใช้เพิ่มเพื่อน หรือปลดบล็อก", "มี replyToken"],
  ["unfollow", "ผู้ใช้บล็อกหรือลบบอท", "ไม่มี replyToken — ตอบกลับไม่ได้"],
  ["join / leave", "บอทถูกเชิญเข้า / ถูกเตะออกจากกลุ่ม", "join มี replyToken"],
  ["memberJoined / memberLeft", "มีคนเข้า/ออกจากกลุ่มที่บอทอยู่", "memberJoined มี replyToken"],
  ["videoPlayComplete", "ผู้ใช้ดูวิดีโอในข้อความจบ", "มี replyToken"],
  ["beacon", "ผู้ใช้เข้าใกล้ LINE Beacon", "มี replyToken"],
];

export default function MessagingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messaging API</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          บอทในห้องแชท ทำงานแบบ <strong>event-driven</strong> — เราไม่ได้ไปดึงข้อความมาเอง
          แต่ LINE จะยิง HTTP POST มาที่ webhook URL ของเราเมื่อมีอะไรเกิดขึ้น
          หน้าที่ของเราคือรับ ตรวจลายเซ็น แล้วตอบกลับ
        </p>
      </div>

      <Card title="ภาพรวมการทำงาน">
        <Pre>{`  ผู้ใช้พิมพ์ "flex" ในแอป LINE
        │
        ▼
  เซิร์ฟเวอร์ LINE
        │  POST ${env.appBaseUrl}/api/line/webhook
        │  header: x-line-signature: <HMAC-SHA256 ของ body>
        │  body:   { "events": [ { "type":"message", "replyToken":"...", ... } ] }
        ▼
  แอปเรา  src/app/api/line/webhook/route.ts
        │  1) อ่าน raw body       ← ห้าม parse ก่อน
        │  2) ตรวจ signature       ← ไม่ตรง = ทิ้ง 401
        │  3) ตอบ 200 ให้เร็ว
        │  4) src/lib/bot.ts เลือกว่าจะตอบอะไร
        ▼
  POST https://api.line.me/v2/bot/message/reply
        { "replyToken": "...", "messages": [ ... ] }
        │
        ▼
  ผู้ใช้เห็นข้อความตอบกลับ`}</Pre>
      </Card>

      <BotStatus />

      <Card title="webhook event ที่เจอบ่อย" subtitle="โค้ดที่จัดการอยู่ที่ src/lib/bot.ts">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium">event.type</th>
                <th className="py-2 pr-4 font-medium">เกิดเมื่อ</th>
                <th className="py-2 font-medium">ตอบกลับได้ไหม</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              {EVENTS.map(([type, when, reply]) => (
                <tr key={type}>
                  <td>
                    <Code>{type}</Code>
                  </td>
                  <td>{when}</td>
                  <td className="text-muted">{reply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="ชนิดข้อความที่ส่งได้"
        subtitle="พิมพ์คำสั่งซ้ายมือในห้องแชทกับบอท เพื่อดูตัวอย่างจริง (หรือกดส่งจากหน้า “ส่งข้อความ”)"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium">พิมพ์ในแชท</th>
                <th className="py-2 pr-4 font-medium">ชนิด</th>
                <th className="py-2 font-medium">คำอธิบาย</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              {SAMPLE_KEYS.map((key) => (
                <tr key={key}>
                  <td>
                    <Code>{key}</Code>
                  </td>
                  <td>{SAMPLES[key].label}</td>
                  <td className="text-muted">{SAMPLES[key].description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          ยังมีคำสั่งอื่นอีก: <Code>help</Code> <Code>me</Code> <Code>id</Code> <Code>quota</Code>{" "}
          <Code>bot</Code> <Code>loading</Code> <Code>echo ...</Code>
        </p>
      </Card>

      <RichMenuControls />

      <Card title="reply กับ push ต่างกันตรงไหน">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium"></th>
                <th className="py-2 pr-4 font-medium">reply</th>
                <th className="py-2 font-medium">push / multicast / broadcast</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr>
                <td className="text-muted">ต้องใช้อะไร</td>
                <td>
                  <Code>replyToken</Code> จาก event
                </td>
                <td>
                  <Code>userId</Code> / <Code>groupId</Code>
                </td>
              </tr>
              <tr>
                <td className="text-muted">ช่วงเวลาที่ใช้ได้</td>
                <td>ประมาณ 1 นาทีหลัง event และใช้ได้ครั้งเดียว</td>
                <td>เมื่อไรก็ได้</td>
              </tr>
              <tr>
                <td className="text-muted">คิดโควตาไหม</td>
                <td className="text-line">ฟรี ไม่นับ</td>
                <td>นับทุกข้อความ ต่อผู้รับ 1 คน</td>
              </tr>
              <tr>
                <td className="text-muted">เหมาะกับ</td>
                <td>ตอบคำถามทันที</td>
                <td>แจ้งเตือน โปรโมชัน สรุปรายวัน</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Note>
        อยากเห็น event ดิบ ๆ ที่ LINE ส่งมา ให้เปิดหน้า{" "}
        <Link href="/webhook" className="underline">
          Webhook log
        </Link>{" "}
        ค้างไว้ แล้วทักบอทในแอป LINE
      </Note>
    </div>
  );
}
