import { env } from "@/lib/env";
import { Card, Code, Note, Pre } from "@/components/ui";
import { LiffClient } from "./liff-client";

export const dynamic = "force-dynamic";

export default function LiffPage() {
  const liffId = env.liffId;
  const endpointUrl = `${env.appBaseUrl}/liff`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LIFF</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          LIFF = LINE Front-end Framework — หน้าเว็บของเราที่เปิดอยู่ใน WebView ของแอป LINE
          ข้อดีคือรู้ทันทีว่าผู้ใช้คือใครโดยไม่ต้องให้กดล็อกอินซ้ำ
          และสั่งงานแอป LINE ได้ เช่น ส่งข้อความเข้าห้องแชทที่กำลังเปิดอยู่
        </p>
      </div>

      {!liffId && (
        <Note tone="warn">
          ยังไม่ได้ตั้ง <Code>NEXT_PUBLIC_LIFF_ID</Code> ใน <Code>.env.local</Code> —
          สร้าง LIFF app ได้ที่ LINE Developers Console &gt; LINE Login channel &gt; แท็บ LIFF &gt; Add
          <br />
          ตอนสร้างให้ใส่ Endpoint URL เป็น <Code>{endpointUrl}</Code>
        </Note>
      )}

      <LiffClient liffId={liffId} />

      <Card title="เปิดหน้านี้ในแอป LINE ยังไง">
        <p className="mb-3 text-sm">
          ทุก LIFF app จะได้ URL หน้าตา <Code>https://liff.line.me/{"{LIFF_ID}"}</Code> —
          เอา URL นี้ส่งเข้าแชท หรือใส่ใน rich menu / ปุ่ม uri action ก็ได้
        </p>
        {liffId ? (
          <Pre>{`LIFF URL ของคุณ:
  https://liff.line.me/${liffId}

ลองส่งให้ตัวเอง: พิมพ์คำสั่งนี้ในแชทกับบอทได้เลย
  echo https://liff.line.me/${liffId}`}</Pre>
        ) : (
          <Pre>{`https://liff.line.me/{LIFF_ID ของคุณ}`}</Pre>
        )}
      </Card>

      <Card title="ค่า Size ตอนสร้าง LIFF app">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium">Size</th>
                <th className="py-2 pr-4 font-medium">ความสูง</th>
                <th className="py-2 font-medium">เหมาะกับ</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr>
                <td>
                  <Code>Full</Code>
                </td>
                <td>เต็มจอ</td>
                <td>ฟอร์มยาว ๆ แคตตาล็อกสินค้า หน้าชำระเงิน</td>
              </tr>
              <tr>
                <td>
                  <Code>Tall</Code>
                </td>
                <td>80% ของจอ</td>
                <td>ฟอร์มสั้น เลือกตัวเลือก</td>
              </tr>
              <tr>
                <td>
                  <Code>Compact</Code>
                </td>
                <td>50% ของจอ</td>
                <td>ยืนยันข้อมูลสั้น ๆ ยังเห็นแชทข้างหลัง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="ความปลอดภัย — จุดที่คนพลาดบ่อยที่สุด">
        <Pre>{`❌ ผิด — เชื่อ userId ที่ browser ส่งมา
   // ฝั่ง client
   const p = await liff.getProfile();
   fetch("/api/order", { body: JSON.stringify({ userId: p.userId }) })
   // ใครก็แก้ userId ใน devtools แล้วสั่งของในนามคนอื่นได้

✅ ถูก — ส่ง token ให้ server ตรวจกับ LINE
   // ฝั่ง client
   const idToken = liff.getIDToken();
   fetch("/api/order", { body: JSON.stringify({ idToken }) })

   // ฝั่ง server (src/app/api/liff/verify/route.ts)
   POST https://api.line.me/oauth2/v2.1/verify
     id_token={idToken}&client_id={CHANNEL_ID}
   → ได้ sub = userId ที่ LINE รับรองแล้ว`}</Pre>
        <p className="mt-3 text-sm text-muted">
          กดปุ่ม &ldquo;ส่ง id_token ให้ server ตรวจ&rdquo; ด้านบนเพื่อดูการทำงานจริง
        </p>
      </Card>

      <Card title="LIFF กับ LINE Login ต่างกันยังไง">
        <p className="text-sm leading-relaxed">
          LIFF ตั้งอยู่ <strong>บน</strong> LINE Login — LIFF app ทุกตัวต้องอยู่ใต้ LINE Login channel
          ต่างกันตรงที่ LINE Login เป็นการล็อกอินบนเว็บทั่วไป (ต้อง redirect ออกไปหน้า LINE แล้วกลับมา)
          ส่วน LIFF เปิดอยู่ในแอป LINE อยู่แล้วจึงรู้ตัวตนได้เลยและสั่งงานแอป LINE เพิ่มได้
        </p>
      </Card>
    </div>
  );
}
