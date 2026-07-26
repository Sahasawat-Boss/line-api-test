import { env } from "@/lib/env";
import { Card, Code, Note, Pre } from "@/components/ui";
import { LogViewer } from "./log-viewer";

export const dynamic = "force-dynamic";

export default function WebhookPage() {
  const webhookUrl = `${env.appBaseUrl}/api/line/webhook`;
  const isLocalhost = webhookUrl.includes("localhost");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhook log</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          ทุก event ที่ LINE ส่งเข้ามาจะถูกเก็บไว้ในหน่วยความจำแล้วแสดงที่นี่
          กดที่แถวเพื่อกาง JSON ดิบ — เป็นวิธีที่เร็วที่สุดในการทำความเข้าใจว่า LINE ส่งอะไรมาให้เราบ้าง
        </p>
      </div>

      <Card title="Webhook URL ที่ต้องใส่ในคอนโซล">
        <Code>{webhookUrl}</Code>
        {isLocalhost && (
          <div className="mt-3">
            <Note tone="warn">
              ตอนนี้ <Code>APP_BASE_URL</Code> ยังเป็น localhost — LINE เข้าถึงไม่ได้
              ให้เปิด <Code>ngrok http 3000</Code> แล้วเอา URL ที่ได้ไปใส่ใน{" "}
              <Code>.env.local</Code> ก่อน
            </Note>
          </div>
        )}
      </Card>

      <LogViewer />

      <Card title="โครงสร้าง request ที่ LINE ส่งมา">
        <Pre>{`POST /api/line/webhook HTTP/1.1
Host: your-app.example.com
Content-Type: application/json
x-line-signature: PWDrK8LJ0Bc/Wj1H+7T1z2X3...      ← ต้องตรวจตัวนี้!

{
  "destination": "Uxxxxxxxxxxxxxxx",               ← userId ของ "บอท" เอง
  "events": [
    {
      "type": "message",
      "webhookEventId": "01H8...",
      "deliveryContext": { "isRedelivery": false }, ← true = LINE ส่งซ้ำเพราะครั้งก่อน fail
      "timestamp": 1700000000000,
      "source": { "type": "user", "userId": "Uxxxx" },
      "replyToken": "0f3779fba3b349968c5d07db31eab56f",
      "mode": "active",
      "message": {
        "id": "468789577898262530",
        "type": "text",
        "text": "flex",
        "quoteToken": "q_xxxx"
      }
    }
  ]
}`}</Pre>
      </Card>

      <Card title="ข้อควรระวังที่ทำให้บอทพัง">
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              <strong>parse body ก่อนตรวจลายเซ็น</strong> — ต้องอ่าน raw body เป็น string ก่อน
              เพราะ HMAC คำนวณจากไบต์ดิบ ถ้า parse แล้ว stringify กลับ ลายเซ็นจะไม่ตรง
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              <strong>ตอบ 5xx เมื่อ handler พัง</strong> — LINE จะ retry ส่ง event เดิมซ้ำ
              ทำให้บอทตอบซ้ำ ควร catch error ไว้แล้วตอบ 200 เสมอ
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              <strong>ใช้ replyToken ซ้ำ</strong> — ใช้ได้ครั้งเดียวและหมดอายุใน ~1 นาที
              ถ้างานนานให้ใช้ push แทน
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              <strong>ลืมปิด Auto-reply message</strong> — ในคอนโซล LINE Official Account Manager
              ถ้าเปิดไว้ บอทจะตอบข้อความอัตโนมัติทับของเรา
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              <strong>ทำงานนานเกินไปก่อนตอบ 200</strong> — เรียก API ช้า ๆ หลายตัวใน handler
              ควร enqueue งานหนักแล้วตอบ 200 ทันที
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
